import { render } from '@testing-library/react-native';

import { PatientsScreen } from '@/src/screens/PatientsScreen';
import { PatientFormScreen } from '@/src/screens/PatientFormScreen';
import { PrescriptionDetailScreen } from '@/src/screens/PrescriptionDetailScreen';
import { PrescriptionFormScreen } from '@/src/screens/PrescriptionFormScreen';
import { SettingsScreen } from '@/src/screens/SettingsScreen';
import { TimelineScreen } from '@/src/screens/TimelineScreen';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({
    id: undefined,
  }),
}));

jest.mock('@/src/services', () => ({
  createAppBoundaries: () => ({
    db: {
      open: jest.fn(async () => ({
        runAsync: jest.fn(async () => undefined),
        getFirstAsync: jest.fn(async () => null),
        getAllAsync: jest.fn(async () => [
          {
            id: 'patient-1',
            name: 'Default Patient',
            relationship: 'Self',
            gender: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ]),
        execBatchAsync: jest.fn(async () => undefined),
      })),
      initialize: jest.fn(async () => undefined),
    },
    imagePicker: {
      pickImage: jest.fn(async () => null),
    },
    imageCompression: {
      compressImage: jest.fn(async (uri: string) => uri),
    },
    fileStorage: {
      saveImage: jest.fn(async (uri: string) => uri),
      deleteFile: jest.fn(async () => undefined),
    },
  }),
  ensureDefaultPatient: jest.fn(async () => 'patient-1'),
  parseTagInput: jest.fn(() => []),
  pickPrescriptionPhoto: jest.fn(async () => null),
  addPrescription: jest.fn(),
}));

describe('Navigation skeleton screens', () => {
  it('renders Patients screen CTA', () => {
    const { getByText, getByTestId } = render(<PatientsScreen />);

    expect(getByText('Patients')).toBeTruthy();
    expect(getByTestId('patients-cta')).toBeTruthy();
  });

  it('renders Add Patient form content', () => {
    const { getByText, getByTestId } = render(<PatientFormScreen mode="add" />);

    expect(getByText('Add Patient')).toBeTruthy();
    expect(getByTestId('patient-form-name-input')).toBeTruthy();
    expect(getByTestId('patient-form-save-button')).toBeTruthy();
  });

  it('renders Timeline screen placeholder', async () => {
    const { getByText, findByTestId } = render(
      <TimelineScreen
        loadData={async () => ({
          patient: null,
          prescriptions: [],
        })}
      />
    );

    await findByTestId('timeline-empty-state');
    expect(getByText('Timeline')).toBeTruthy();
    expect(await findByTestId('timeline-search-panel')).toBeTruthy();
  });

  it('renders Add Prescription form content', async () => {
    const { getByText, getByTestId, findByTestId } = render(
      <PrescriptionFormScreen mode="add" />
    );

    await findByTestId('patient-option-patient-1');
    expect(getByText('Add Prescription')).toBeTruthy();
    expect(getByTestId('prescription-form-photo')).toBeTruthy();
    expect(getByTestId('prescription-form-fields')).toBeTruthy();
  });

  it('renders Edit Prescription form content', async () => {
    const { getByText, findByTestId } = render(<PrescriptionFormScreen mode="edit" />);

    await findByTestId('patient-option-patient-1');
    expect(getByText('Edit Prescription')).toBeTruthy();
  });

  it('renders Prescription detail actions', () => {
    const { getByText, getByTestId } = render(
      <PrescriptionDetailScreen
        previewPrescription={{
          photoUri: 'file://preview.jpg',
          doctorName: 'Dr. Preview',
          doctorSpecialty: 'General',
          condition: 'Preview condition',
          tags: ['preview'],
          visitDate: '2025-02-01',
          notes: 'Preview notes',
        }}
      />
    );

    expect(getByText('Prescription Detail')).toBeTruthy();
    expect(getByTestId('prescription-detail-actions')).toBeTruthy();
  });

  it('renders Settings privacy content', () => {
    const { getByText, getByTestId } = render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Privacy')).toBeTruthy();
    expect(getByTestId('settings-about')).toBeTruthy();
  });
});
