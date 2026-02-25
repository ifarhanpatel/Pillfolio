import { listPatients } from '../db/patients';
import { searchPrescriptions } from '../db/prescriptions';
import type { Patient, Prescription } from '../db/types';
import type { AppBoundaries } from './boundaries';

export type BackupSnapshot = {
  version: 1;
  exportedAt: string;
  patients: Patient[];
  prescriptions: Prescription[];
};

export type BackupImportMode = 'replace' | 'merge';

export type BackupImportResult = {
  importedPatients: number;
  importedPrescriptions: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBackupSnapshot = (value: unknown): value is BackupSnapshot => {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.patients) &&
    Array.isArray(value.prescriptions)
  );
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

export const exportBackup = async (boundaries: AppBoundaries): Promise<{ fileUri: string }> => {
  const driver = await boundaries.db.open();
  await boundaries.db.initialize(driver);

  const snapshot: BackupSnapshot = {
    version: 1,
    exportedAt: boundaries.clock.nowIso(),
    patients: await listPatients(driver),
    prescriptions: await searchPrescriptions(driver, { searchAllPatients: true }),
  };

  const fileName = `pillfolio-backup-${snapshot.exportedAt.replace(/[:.]/g, '-')}.json`;
  const contents = JSON.stringify(snapshot, null, 2);
  const fileUri = await boundaries.backup.saveBackupFile(fileName, contents);
  await boundaries.backup.shareFile(fileUri);

  return { fileUri };
};

export const importBackup = async (
  boundaries: AppBoundaries,
  mode: BackupImportMode
): Promise<BackupImportResult> => {
  const fileUri = await boundaries.backup.pickBackupFile();
  if (!fileUri) {
    return {
      importedPatients: 0,
      importedPrescriptions: 0,
    };
  }

  const rawContents = await boundaries.backup.readBackupFile(fileUri);
  const payload: unknown = JSON.parse(rawContents);
  if (!isBackupSnapshot(payload)) {
    throw new Error('Invalid backup file format.');
  }

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
    if (mode === 'merge') {
      const existing = await driver.getFirstAsync<{ id: string }>('SELECT * FROM prescriptions WHERE id = ?;', [
        prescription.id,
      ]);
      if (existing) {
        await driver.runAsync('DELETE FROM prescriptions WHERE id = ?;', [prescription.id]);
      }
    }

    await driver.runAsync(
      'INSERT INTO prescriptions (id, patientId, photoUri, doctorName, doctorSpecialty, condition, tagsJson, visitDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        prescription.id,
        prescription.patientId,
        prescription.photoUri,
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

  return {
    importedPatients: payload.patients.length,
    importedPrescriptions: payload.prescriptions.length,
  };
};
