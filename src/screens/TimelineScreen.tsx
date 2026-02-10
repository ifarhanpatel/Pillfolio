import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listPatients } from '@/src/db/patients';
import { listPrescriptionsByPatient } from '@/src/db/prescriptions';
import type { Patient, Prescription } from '@/src/db/types';
import { initializeDb, openDb } from '@/src/db';

export type TimelineData = {
  patient: Patient | null;
  prescriptions: Prescription[];
};

type TimelineScreenProps = {
  loadData?: () => Promise<TimelineData>;
  onOpenPrescription?: (prescriptionId: string) => void;
};

const formatVisitDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const sortPrescriptionsByVisitDateDesc = (
  prescriptions: Prescription[]
): Prescription[] => {
  return [...prescriptions].sort((a, b) => {
    const visitDateOrder = b.visitDate.localeCompare(a.visitDate);
    if (visitDateOrder !== 0) {
      return visitDateOrder;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
};

const defaultLoadTimelineData = async (): Promise<TimelineData> => {
  const driver = await openDb();
  await initializeDb(driver);

  const patients = await listPatients(driver);
  const selectedPatient = patients[0] ?? null;

  if (!selectedPatient) {
    return {
      patient: null,
      prescriptions: [],
    };
  }

  const prescriptions = await listPrescriptionsByPatient(driver, selectedPatient.id);
  return {
    patient: selectedPatient,
    prescriptions,
  };
};

export function TimelineScreen({
  loadData = defaultLoadTimelineData,
  onOpenPrescription,
}: TimelineScreenProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const timelineData = await loadData();
        if (!mounted) {
          return;
        }

        setPatient(timelineData.patient);
        setPrescriptions(sortPrescriptionsByVisitDateDesc(timelineData.prescriptions));
      } catch {
        if (!mounted) {
          return;
        }

        setPatient(null);
        setPrescriptions([]);
        setErrorMessage('Unable to load timeline.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  const subtitle = useMemo(() => {
    if (patient) {
      return `${patient.name}'s prescriptions`;
    }

    return 'Select a patient to view prescriptions.';
  }, [patient]);

  const renderCard = ({ item }: { item: Prescription }) => {
    return (
      <Pressable
        onPress={() => onOpenPrescription?.(item.id)}
        style={styles.card}
        testID={`timeline-card-${item.id}`}>
        <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
        <ThemedView style={styles.cardBody}>
          <ThemedText
            type="defaultSemiBold"
            testID={`timeline-card-date-${item.id}`}>
            {formatVisitDate(item.visitDate)}
          </ThemedText>
          <ThemedText type="default">{item.doctorName}</ThemedText>
          <ThemedText type="default">{item.condition}</ThemedText>
          <ThemedText type="default" numberOfLines={1}>
            {item.tags.join(', ')}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container} testID="timeline-screen">
      <ThemedText type="title">Timeline</ThemedText>
      <ThemedText type="default">{subtitle}</ThemedText>
      <ThemedView style={styles.searchPlaceholder} testID="timeline-search-placeholder">
        <ThemedText type="defaultSemiBold">Search</ThemedText>
        <ThemedText type="default">Search and filters are coming next.</ThemedText>
      </ThemedView>
      {isLoading ? (
        <ThemedText type="default">Loading timeline...</ThemedText>
      ) : null}
      {!isLoading && errorMessage ? <ThemedText type="default">{errorMessage}</ThemedText> : null}
      {!isLoading && !errorMessage && patient && prescriptions.length === 0 ? (
        <ThemedText type="default" testID="timeline-empty-state">
          No prescriptions found for this patient.
        </ThemedText>
      ) : null}
      {!isLoading && !errorMessage && !patient ? (
        <ThemedText type="default" testID="timeline-empty-state">
          No patients available yet.
        </ThemedText>
      ) : null}
      {!isLoading && prescriptions.length > 0 ? (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          testID="timeline-list"
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  searchPlaceholder: {
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#C8CDD2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D4D8DD',
    borderRadius: 12,
    padding: 10,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E8ECEF',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
});
