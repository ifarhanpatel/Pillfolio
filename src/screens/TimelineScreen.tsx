import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listPatients } from '@/src/db/patients';
import { searchPrescriptions } from '@/src/db/prescriptions';
import type { Patient, Prescription } from '@/src/db/types';
import { initializeDb, openDb } from '@/src/db';

export type TimelineData = {
  patient: Patient | null;
  prescriptions: Prescription[];
};

type TimelineScreenProps = {
  loadData?: (input: { query: string; searchAllPatients: boolean }) => Promise<TimelineData>;
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

const defaultLoadTimelineData = async (input: {
  query: string;
  searchAllPatients: boolean;
}): Promise<TimelineData> => {
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

  const prescriptions = await searchPrescriptions(driver, {
    patientId: selectedPatient.id,
    query: input.query,
    searchAllPatients: input.searchAllPatients,
  });
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
  const [query, setQuery] = useState('');
  const [searchAllPatients, setSearchAllPatients] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const timelineData = await loadData({
          query,
          searchAllPatients,
        });
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
  }, [loadData, query, searchAllPatients]);

  const subtitle = useMemo(() => {
    if (searchAllPatients) {
      return 'Showing prescriptions from all patients.';
    }

    if (patient) {
      return `${patient.name}'s prescriptions`;
    }

    return 'Select a patient to view prescriptions.';
  }, [patient, searchAllPatients]);

  const emptyStateMessage = useMemo(() => {
    if (query.trim()) {
      return searchAllPatients
        ? 'No matching prescriptions found.'
        : 'No matching prescriptions found for this patient.';
    }

    if (searchAllPatients) {
      return 'No prescriptions found.';
    }

    return 'No prescriptions found for this patient.';
  }, [query, searchAllPatients]);

  const renderCard = ({ item }: { item: Prescription }) => {
    return (
      <Pressable
        onPress={() => onOpenPrescription?.(item.id)}
        style={styles.card}
        testID={`timeline-card-${item.id}`}>
        <Image source={{ uri: item.photoUri }} style={styles.thumbnail} resizeMode="cover" />
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
      <ThemedView style={styles.searchContainer} testID="timeline-search-panel">
        <ThemedText type="defaultSemiBold">Search</ThemedText>
        <TextInput
          placeholder="Doctor, condition, or tag"
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          testID="timeline-search-input"
        />
        <View style={styles.searchActions}>
          <Pressable
            style={[
              styles.scopeToggleButton,
              searchAllPatients ? styles.scopeToggleButtonActive : null,
            ]}
            onPress={() => setSearchAllPatients((current) => !current)}
            testID="timeline-search-scope-toggle">
            <ThemedText type="defaultSemiBold">
              {searchAllPatients ? 'Searching all patients' : 'Searching selected patient'}
            </ThemedText>
          </Pressable>
          {query.trim().length > 0 ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => setQuery('')}
              testID="timeline-search-clear">
              <ThemedText type="defaultSemiBold">Clear</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ThemedView>
      {isLoading ? (
        <ThemedText type="default">Loading timeline...</ThemedText>
      ) : null}
      {!isLoading && errorMessage ? <ThemedText type="default">{errorMessage}</ThemedText> : null}
      {!isLoading && !errorMessage && patient && prescriptions.length === 0 ? (
        <ThemedText type="default" testID="timeline-empty-state">
          {emptyStateMessage}
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
  searchContainer: {
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#C8CDD2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#C8CDD2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  scopeToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  scopeToggleButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#C8CDD2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
