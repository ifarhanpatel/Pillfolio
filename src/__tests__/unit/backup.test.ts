import { createPatient } from '../../db/patients';
import { createPrescription, getPrescriptionById } from '../../db/prescriptions';
import {
  exportBackup,
  importBackup,
  saveBackupToDeviceFiles,
  type BackupImportMode,
  type BackupSnapshot,
} from '../../services/backup';
import { FakeDriver } from '../helpers/fakeDriver';
import { createTestBoundaries } from '../helpers/mockBoundaries';

const createSeedData = async (driver: FakeDriver) => {
  const patient = await createPatient(driver, {
    name: 'Jane Doe',
    relationship: 'Self',
    isPrimary: true,
  });

  const prescription = await createPrescription(driver, {
    patientId: patient.id,
    photoUri: 'file://stored/photo-1.jpg',
    doctorName: 'Dr. A',
    doctorSpecialty: 'GP',
    condition: 'Condition A',
    tags: ['morning'],
    visitDate: '2026-01-02',
    notes: 'note',
  });

  return { patient, prescription };
};

describe('backup service', () => {
  test('exportBackup persists snapshot JSON and shares file', async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const driver = mocks.db.driver as FakeDriver;
    await createSeedData(driver);
    mocks.backup.sourceFileBase64ByUri.set('file://stored/photo-1.jpg', 'aW1hZ2UtMQ==');

    const result = await exportBackup(boundaries);

    expect(result.fileUri).toContain('pillfolio-backup-');
    expect(mocks.backup.savedBackups).toHaveLength(1);
    expect(mocks.backup.sharedFiles).toEqual([result.fileUri]);

    const saved = JSON.parse(mocks.backup.savedBackups[0].contents) as BackupSnapshot;
    expect(saved.version).toBe(1);
    expect(saved.patients).toHaveLength(1);
    expect(saved.prescriptions).toHaveLength(1);
    expect(saved.prescriptionImages).toEqual([
      {
        prescriptionId: saved.prescriptions[0].id,
        fileName: `prescription-${saved.prescriptions[0].id}.jpg`,
        base64Contents: 'aW1hZ2UtMQ==',
      },
    ]);
  });

  test('saveBackupToDeviceFiles persists snapshot JSON and saves to device files', async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const driver = mocks.db.driver as FakeDriver;
    await createSeedData(driver);

    const result = await saveBackupToDeviceFiles(boundaries);

    expect(result.fileUri).toContain('pillfolio-backup-');
    expect(mocks.backup.savedBackups).toHaveLength(1);
    expect(mocks.backup.sharedFiles).toEqual([]);
    expect(mocks.backup.deviceSavedFiles).toHaveLength(1);
    expect(mocks.backup.deviceSavedFiles[0].fileUri).toBe(result.fileUri);
    expect(result.deviceFileUri).toContain('file://mock-device-files/pillfolio-backup-');
  });

  test.each<BackupImportMode>(['replace', 'merge'])(
    'importBackup restores data in %s mode',
    async (mode) => {
      const { boundaries, mocks } = createTestBoundaries();
      const driver = mocks.db.driver as FakeDriver;
      const { patient } = await createSeedData(driver);

      const backupPayload: BackupSnapshot = {
        version: 1,
        exportedAt: '2026-02-10T00:00:00.000Z',
        patients: [
          {
            id: patient.id,
            name: 'Jane Updated',
            relationship: 'Self',
            gender: null,
            age: null,
            isPrimary: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-10T00:00:00.000Z',
          },
          {
            id: 'patient-2',
            name: 'New Patient',
            relationship: 'Parent',
            gender: null,
            age: null,
            isPrimary: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-10T00:00:00.000Z',
          },
        ],
        prescriptions: [
          {
            id: 'rx-1',
            patientId: patient.id,
            photoUri: 'file://stored/rx-1.jpg',
            doctorName: 'Dr. Merge',
            doctorSpecialty: null,
            condition: 'Updated condition',
            tags: ['night'],
            visitDate: '2026-01-08',
            notes: null,
            createdAt: '2026-01-08T00:00:00.000Z',
            updatedAt: '2026-01-08T00:00:00.000Z',
          },
        ],
        prescriptionImages: [
          {
            prescriptionId: 'rx-1',
            fileName: 'rx-1.jpg',
            base64Contents: 'cmVzdG9yZWQtaW1hZ2U=',
          },
        ],
      };
      mocks.backup.pickedUri = 'file://picked/backup.json';
      mocks.backup.fileContentsByUri.set('file://picked/backup.json', JSON.stringify(backupPayload));

      const result = await importBackup(boundaries, mode);

      expect(result.importedPatients).toBe(2);
      expect(result.importedPrescriptions).toBe(1);
      expect(driver.patients.find((row) => row.id === patient.id)?.name).toBe('Jane Updated');
      const importedRx = await getPrescriptionById(driver, 'rx-1');
      expect(importedRx?.doctorName).toBe('Dr. Merge');
      expect(importedRx?.photoUri).toBe('file://mock-storage/prescriptions/rx-1.jpg');
      expect(mocks.backup.restoredPrescriptionImages).toContainEqual({
        fileName: 'rx-1.jpg',
        base64Contents: 'cmVzdG9yZWQtaW1hZ2U=',
      });
    }
  );

  test('importBackup reports invalid payload', async () => {
    const { boundaries, mocks } = createTestBoundaries();
    mocks.backup.pickedUri = 'file://picked/invalid.json';
    mocks.backup.fileContentsByUri.set('file://picked/invalid.json', JSON.stringify({ version: 99 }));

    await expect(importBackup(boundaries, 'replace')).rejects.toThrow('Invalid backup file format.');
  });
});
