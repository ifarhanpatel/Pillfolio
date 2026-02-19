import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { patientFixture, prescriptionFixture } from '@/src/__tests__/fixtures';
import { sortPrescriptionsByVisitDateDesc, TimelineScreen } from '@/src/screens/TimelineScreen';

describe('TimelineScreen', () => {
  test('sortPrescriptionsByVisitDateDesc returns newest first', () => {
    const newest = prescriptionFixture({
      id: 'prescription-newest',
      visitDate: '2025-03-10',
      createdAt: '2025-03-10T10:00:00.000Z',
    });
    const oldest = prescriptionFixture({
      id: 'prescription-oldest',
      visitDate: '2025-01-15',
      createdAt: '2025-01-15T09:30:00.000Z',
    });
    const middle = prescriptionFixture({
      id: 'prescription-middle',
      visitDate: '2025-02-20',
      createdAt: '2025-02-20T09:30:00.000Z',
    });

    const sorted = sortPrescriptionsByVisitDateDesc([middle, oldest, newest]);

    expect(sorted.map((prescription) => prescription.id)).toEqual([
      'prescription-newest',
      'prescription-middle',
      'prescription-oldest',
    ]);
  });

  test('renders cards from loaded timeline data', async () => {
    const patient = patientFixture({ id: 'patient-a', name: 'Jordan' });
    const first = prescriptionFixture({
      id: 'prescription-1',
      patientId: patient.id,
      doctorName: 'Dr. First',
      condition: 'Condition A',
      visitDate: '2025-02-01',
      tags: ['morning'],
    });
    const second = prescriptionFixture({
      id: 'prescription-2',
      patientId: patient.id,
      doctorName: 'Dr. Second',
      condition: 'Condition B',
      visitDate: '2025-02-03',
      tags: ['night'],
    });

    const loadData = jest.fn(async () => ({
      patient,
      prescriptions: [first, second],
    }));
    const { getByTestId, getByText } = render(<TimelineScreen loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalled();
      expect(getByText('Dr. Second')).toBeTruthy();
    });

    expect(getByText("Jordan's prescriptions")).toBeTruthy();
    expect(getByTestId('timeline-card-prescription-2')).toBeTruthy();
    expect(getByTestId('timeline-search-panel')).toBeTruthy();
    expect(getByText('Condition B')).toBeTruthy();
  });

  test('passes query and search scope to loadData', async () => {
    const patient = patientFixture({ id: 'patient-a', name: 'Jordan' });
    const byPatient = prescriptionFixture({
      id: 'patient-only',
      patientId: patient.id,
      doctorName: 'Dr. Local',
    });
    const globalMatch = prescriptionFixture({
      id: 'global-match',
      patientId: 'patient-b',
      doctorName: 'Dr. Remote',
    });

    const loadData = jest.fn(
      async ({ query, searchAllPatients }: { query: string; searchAllPatients: boolean }) => {
        const all = [byPatient, globalMatch];
        const scoped = searchAllPatients ? all : [byPatient];
        const normalized = query.trim().toLowerCase();

        return {
          patient,
          prescriptions: scoped.filter((item) => {
            if (!normalized) {
              return true;
            }

            const searchable = `${item.doctorName} ${item.condition} ${item.tags.join(' ')}`.toLowerCase();
            return searchable.includes(normalized);
          }),
        };
      }
    );

    const { getByTestId, queryByText } = render(<TimelineScreen loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenLastCalledWith({ query: '', searchAllPatients: false });
    });

    fireEvent.changeText(getByTestId('timeline-search-input'), 'remote');

    await waitFor(() => {
      expect(loadData).toHaveBeenLastCalledWith({
        query: 'remote',
        searchAllPatients: false,
      });
    });
    expect(queryByText('Dr. Remote')).toBeNull();

    fireEvent.press(getByTestId('timeline-search-scope-toggle'));

    await waitFor(() => {
      expect(loadData).toHaveBeenLastCalledWith({
        query: 'remote',
        searchAllPatients: true,
      });
    });

    await waitFor(() => {
      expect(queryByText('Dr. Remote')).toBeTruthy();
    });
  });
});
