import { listPatients } from '../db/patients';
import { searchPrescriptions } from '../db/prescriptions';
import type { Patient, Prescription } from '../db/types';
import type { AppBoundaries } from './boundaries';
import {
  addSentryBreadcrumb,
  captureSentryException,
  withSentrySpan,
} from './sentry';

export type BackupPrescriptionImage = {
  prescriptionId: string;
  fileName: string;
  base64Contents: string;
};

export type BackupSnapshot = {
  version: 1;
  exportedAt: string;
  patients: Patient[];
  prescriptions: Prescription[];
  prescriptionImages?: BackupPrescriptionImage[];
};

export type BackupImportMode = 'replace' | 'merge';

export type BackupImportResult = {
  importedPatients: number;
  importedPrescriptions: number;
};

export type BackupExportResult = {
  fileUri: string;
};

export type DeviceFilesBackupExportResult = BackupExportResult & {
  deviceFileUri: string | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBackupPrescriptionImage = (value: unknown): value is BackupPrescriptionImage => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.prescriptionId === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.base64Contents === 'string'
  );
};

const isBackupSnapshot = (value: unknown): value is BackupSnapshot => {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.patients) &&
    Array.isArray(value.prescriptions) &&
    (value.prescriptionImages === undefined ||
      (Array.isArray(value.prescriptionImages) &&
        value.prescriptionImages.every((image) => isBackupPrescriptionImage(image))))
  );
};

const toSafeFileName = (fileName: string): string => fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

const getBackupImageFileName = (prescription: Prescription): string => {
  const sanitizedSource = prescription.photoUri.split(/[?#]/, 1)[0] ?? '';
  const candidate = sanitizedSource.slice(sanitizedSource.lastIndexOf('/') + 1);
  const extensionMatch = candidate.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
  return toSafeFileName(`prescription-${prescription.id}.${extension}`);
};

const clearExistingData = async (boundaries: AppBoundaries): Promise<void> => {
  const driver = await boundaries.db.open();
  const existingPrescriptions = await searchPrescriptions(driver, { searchAllPatients: true });
  for (const prescription of existingPrescriptions) {
    await driver.runAsync('DELETE FROM prescriptions WHERE id = ?;', [prescription.id]);
  }

  const existingPatients = await listPatients(driver);
  for (const patient of existingPatients) {
    await driver.runAsync('DELETE FROM patients WHERE id = ?;', [patient.id]);
  }
};

type BackupSnapshotSummary = {
  patients_count: number;
  prescriptions_count: number;
  has_images: boolean;
};

const createBackupSnapshotFile = async (boundaries: AppBoundaries): Promise<{
  fileName: string;
  fileUri: string;
  summary: BackupSnapshotSummary;
}> => {
  const driver = await boundaries.db.open();
  await boundaries.db.initialize(driver);

  const snapshot: BackupSnapshot = {
    version: 1,
    exportedAt: boundaries.clock.nowIso(),
    patients: await listPatients(driver),
    prescriptions: await searchPrescriptions(driver, { searchAllPatients: true }),
  };

  const prescriptionImages: BackupPrescriptionImage[] = [];
  for (const prescription of snapshot.prescriptions) {
    try {
      const base64Contents = await boundaries.backup.readFileAsBase64(prescription.photoUri);
      prescriptionImages.push({
        prescriptionId: prescription.id,
        fileName: getBackupImageFileName(prescription),
        base64Contents,
      });
    } catch {
      // Keep exporting structured data even if a local image file is missing.
    }
  }

  if (prescriptionImages.length > 0) {
    snapshot.prescriptionImages = prescriptionImages;
  }

  const fileName = `pillfolio-backup-${snapshot.exportedAt.replace(/[:.]/g, '-')}.json`;
  const contents = JSON.stringify(snapshot, null, 2);
  const fileUri = await boundaries.backup.saveBackupFile(fileName, contents);

  return {
    fileName,
    fileUri,
    summary: {
      patients_count: snapshot.patients.length,
      prescriptions_count: snapshot.prescriptions.length,
      has_images: prescriptionImages.length > 0,
    },
  };
};

export const exportBackup = async (boundaries: AppBoundaries): Promise<BackupExportResult> => {
  addSentryBreadcrumb({
    category: 'backup',
    message: 'exportBackup:start',
  });

  let summary: BackupSnapshotSummary | undefined;

  try {
    const snapshotFile = await withSentrySpan('create-backup-snapshot', 'backup', async () => {
      return createBackupSnapshotFile(boundaries);
    });
    summary = snapshotFile.summary;

    await withSentrySpan('share-backup-file', 'backup', async () => {
      await boundaries.backup.shareFile(snapshotFile.fileUri);
    });

    addSentryBreadcrumb({
      category: 'backup',
      message: 'exportBackup:success',
      data: summary,
    });

    return { fileUri: snapshotFile.fileUri };
  } catch (error) {
    captureSentryException(error, {
      area: 'backup',
      action: 'export',
      data: summary,
    });
    throw error;
  }
};

export const saveBackupToDeviceFiles = async (
  boundaries: AppBoundaries
): Promise<DeviceFilesBackupExportResult> => {
  addSentryBreadcrumb({
    category: 'backup',
    message: 'saveBackupToDeviceFiles:start',
  });

  let summary: BackupSnapshotSummary | undefined;

  try {
    const snapshotFile = await withSentrySpan('create-backup-snapshot', 'backup', async () => {
      return createBackupSnapshotFile(boundaries);
    });
    summary = snapshotFile.summary;

    const deviceFileUri = await withSentrySpan('save-backup-to-device-files', 'backup', async () => {
      return boundaries.backup.saveToDeviceFiles(snapshotFile.fileUri, snapshotFile.fileName);
    });

    addSentryBreadcrumb({
      category: 'backup',
      message: deviceFileUri ? 'saveBackupToDeviceFiles:success' : 'saveBackupToDeviceFiles:cancelled',
      data: {
        ...summary,
        cancelled: deviceFileUri === null,
      },
      level: deviceFileUri ? 'info' : 'warning',
    });

    return { fileUri: snapshotFile.fileUri, deviceFileUri };
  } catch (error) {
    captureSentryException(error, {
      area: 'backup',
      action: 'save_to_device_files',
      data: summary,
    });
    throw error;
  }
};

export const importBackup = async (
  boundaries: AppBoundaries,
  mode: BackupImportMode
): Promise<BackupImportResult> => {
  addSentryBreadcrumb({
    category: 'backup',
    message: 'importBackup:start',
    data: {
      mode,
    },
  });

  let summary:
    | (BackupSnapshotSummary & {
        mode: BackupImportMode;
      })
    | undefined;

  try {
    const fileUri = await boundaries.backup.pickBackupFile();
    if (!fileUri) {
      addSentryBreadcrumb({
        category: 'backup',
        message: 'importBackup:cancelled',
        level: 'warning',
        data: {
          mode,
          cancelled: true,
        },
      });
      return {
        importedPatients: 0,
        importedPrescriptions: 0,
      };
    }

    const payload = await withSentrySpan('parse-backup-import', 'backup', async () => {
      const rawContents = await boundaries.backup.readBackupFile(fileUri);
      return JSON.parse(rawContents) as unknown;
    });

    if (!isBackupSnapshot(payload)) {
      addSentryBreadcrumb({
        category: 'backup',
        message: 'importBackup:validation_failure',
        level: 'warning',
        data: {
          mode,
        },
      });
      throw new Error('Invalid backup file format.');
    }

    summary = {
      mode,
      patients_count: payload.patients.length,
      prescriptions_count: payload.prescriptions.length,
      has_images: (payload.prescriptionImages?.length ?? 0) > 0,
    };

    const imageByPrescriptionId = new Map<string, BackupPrescriptionImage>();
    for (const image of payload.prescriptionImages ?? []) {
      imageByPrescriptionId.set(image.prescriptionId, image);
    }

    await withSentrySpan('import-backup-db-write', 'backup', async () => {
      const driver = await boundaries.db.open();
      await boundaries.db.initialize(driver);

      if (mode === 'replace') {
        await clearExistingData(boundaries);
      }

      for (const patient of payload.patients) {
        if (mode === 'merge') {
          const existing = await driver.getFirstAsync<{ id: string }>('SELECT * FROM patients WHERE id = ?;', [
            patient.id,
          ]);
          if (existing) {
            await driver.runAsync(
              'UPDATE patients SET name = ?, relationship = ?, gender = ?, age = ?, isPrimary = ?, updatedAt = ? WHERE id = ?;',
              [
                patient.name,
                patient.relationship,
                patient.gender,
                patient.age,
                patient.isPrimary ? 1 : 0,
                patient.updatedAt,
                patient.id,
              ]
            );
            continue;
          }
        }

        await driver.runAsync(
          'INSERT INTO patients (id, name, relationship, gender, age, isPrimary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [
            patient.id,
            patient.name,
            patient.relationship,
            patient.gender,
            patient.age,
            patient.isPrimary ? 1 : 0,
            patient.createdAt,
            patient.updatedAt,
          ]
        );
      }

      for (const prescription of payload.prescriptions) {
        let restoredPhotoUri = prescription.photoUri;
        const backupImage = imageByPrescriptionId.get(prescription.id);
        if (backupImage) {
          restoredPhotoUri = await boundaries.backup.savePrescriptionImageFromBase64(
            backupImage.fileName,
            backupImage.base64Contents
          );
        }

        if (mode === 'merge') {
          const existing = await driver.getFirstAsync<{ id: string }>(
            'SELECT * FROM prescriptions WHERE id = ?;',
            [prescription.id]
          );
          if (existing) {
            await driver.runAsync('DELETE FROM prescriptions WHERE id = ?;', [prescription.id]);
          }
        }

        await driver.runAsync(
          'INSERT INTO prescriptions (id, patientId, photoUri, doctorName, doctorSpecialty, condition, tagsJson, visitDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            prescription.id,
            prescription.patientId,
            restoredPhotoUri,
            prescription.doctorName,
            prescription.doctorSpecialty,
            prescription.condition,
            JSON.stringify(prescription.tags),
            prescription.visitDate,
            prescription.notes,
            prescription.createdAt,
            prescription.updatedAt,
          ]
        );
      }
    }, {
      mode,
      has_images: summary.has_images,
      patients_count: summary.patients_count,
      prescriptions_count: summary.prescriptions_count,
    });

    addSentryBreadcrumb({
      category: 'backup',
      message: 'importBackup:success',
      data: summary,
    });

    return {
      importedPatients: payload.patients.length,
      importedPrescriptions: payload.prescriptions.length,
    };
  } catch (error) {
    captureSentryException(error, {
      area: 'backup',
      action: `import_${mode}`,
      data: summary ?? { mode },
    });
    throw error;
  }
};
