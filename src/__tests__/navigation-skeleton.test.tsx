import { render, waitFor } from '@testing-library/react-native';

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
    const { getByText, getByTestId } = render(
      <TimelineScreen
        loadData={async () => ({
          patient: null,
          prescriptions: [],
        })}
      />
    );

    await waitFor(() => {
      expect(getByText('Timeline')).toBeTruthy();
      expect(getByTestId('timeline-search-placeholder')).toBeTruthy();
    });
  });

  it('renders Add Prescription form content', async () => {
    const { getByText, getByTestId } = render(<PrescriptionFormScreen mode="add" />);

    await waitFor(() => {
      expect(getByText('Add Prescription')).toBeTruthy();
      expect(getByTestId('prescription-form-photo')).toBeTruthy();
      expect(getByTestId('prescription-form-fields')).toBeTruthy();
    });
  });

  it('renders Edit Prescription form content', async () => {
    const { getByText } = render(<PrescriptionFormScreen mode="edit" />);

    await waitFor(() => {
      expect(getByText('Edit Prescription')).toBeTruthy();
    });
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
