import { useContext, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDb, openDb } from '@/src/db';
import { listPatients } from '@/src/db/patients';
import { searchPrescriptions } from '@/src/db/prescriptions';
import type { Patient, Prescription } from '@/src/db/types';

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
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [query, setQuery] = useState('');
  const [searchAllPatients, setSearchAllPatients] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const patientSubtitle = useMemo(() => {
    if (searchAllPatients) {
      return 'Showing prescriptions from all patients.';
    }

    if (patient) {
      return `${patient.name}'s prescriptions`;
    }

    return 'Select a patient to view prescriptions.';
  }, [patient, searchAllPatients]);

  const recordsSubtitle = useMemo(() => {
    const label = prescriptions.length === 1 ? 'Record' : 'Records';
    return `${prescriptions.length} ${label} Shown • Locally Stored`;
  }, [prescriptions.length]);

  const refreshTimeline = async () => {
    setIsRefreshing(true);
    try {
      const timelineData = await loadData({
        query,
        searchAllPatients,
      });
      setPatient(timelineData.patient);
      setPrescriptions(sortPrescriptionsByVisitDateDesc(timelineData.prescriptions));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Unable to load timeline.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderCard = ({ item, index }: { item: Prescription; index: number }) => {
    return (
      <View style={styles.timelineItemWrap}>
        <View style={[styles.dot, index === 0 ? styles.dotActive : undefined]} />
        <Pressable
          onPress={() => onOpenPrescription?.(item.id)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          testID={`timeline-card-${item.id}`}
        >
          <View style={styles.cardBody}>
            <ThemedText style={styles.cardMeta} testID={`timeline-card-date-${item.id}`}>
              {formatVisitDate(item.visitDate)}
            </ThemedText>
            <ThemedText style={styles.cardDoctor}>{item.doctorName}</ThemedText>
            <ThemedText style={styles.cardTitle}>{item.condition}</ThemedText>
            <View style={styles.badgeRow}>
              {item.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{tag.toUpperCase()}</ThemedText>
                </View>
              ))}
            </View>
          </View>
          <Image source={{ uri: item.photoUri }} style={styles.thumb} resizeMode="cover" />
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="timeline-screen">
      <View style={styles.headerRow}>
        <View style={styles.headTextWrap}>
          <ThemedText style={styles.headerTitle}>Timeline</ThemedText>
          <ThemedText style={styles.headerSub}>{recordsSubtitle}</ThemedText>
          <ThemedText style={styles.headerSubSecondary}>{patientSubtitle}</ThemedText>
        </View>
      </View>

      <View style={styles.searchContainer} testID="timeline-search-panel">
        <MaterialIcons name="search" size={18} color="#60779A" />
        <TextInput
          placeholder="Search prescriptions (e.g. Fever, Dr. Mehta)"
          placeholderTextColor="#60779A"
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          testID="timeline-search-input"
        />
      </View>

      <Pressable
        style={[styles.scopeToggleButton, searchAllPatients && styles.scopeToggleButtonActive]}
        onPress={() => setSearchAllPatients((current) => !current)}
        testID="timeline-search-scope-toggle"
      >
        <ThemedText style={styles.scopeLabel}>
          {searchAllPatients ? 'Searching all patients' : 'Searching selected patient'}
        </ThemedText>
      </Pressable>

      <ThemedText style={styles.monthLabel}>AUGUST 2023</ThemedText>

      {isLoading ? <ThemedText style={styles.helper}>Loading timeline...</ThemedText> : null}
      {!isLoading && errorMessage ? <ThemedText style={styles.helper}>{errorMessage}</ThemedText> : null}
      {!isLoading && !errorMessage && patient && prescriptions.length === 0 ? (
        <ThemedText style={styles.helper} testID="timeline-empty-state">
          {emptyStateMessage}
        </ThemedText>
      ) : null}
      {!isLoading && !errorMessage && !patient ? (
        <ThemedText style={styles.helper} testID="timeline-empty-state">
          No patients available yet.
        </ThemedText>
      ) : null}

      <ScrollView
        style={styles.timelineTrackWrap}
        contentContainerStyle={styles.timelineScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshTimeline()}
            tintColor="#137FEC"
          />
        }
      >
        {prescriptions.length > 0 ? (
          <View style={styles.list} testID="timeline-list">
            <View style={styles.track} />
            {prescriptions.map((item, index) => (
              <View key={item.id}>{renderCard({ item, index })}</View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101922',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headTextWrap: {
    width: '100%',
  },
  headerTitle: {
    color: '#E4EDF9',
    fontWeight: '800',
    fontSize: 34 / 1.5,
    lineHeight: 38 / 1.5,
  },
  headerSub: {
    color: '#8A9EB9',
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
  },
  headerSubSecondary: {
    color: '#6D82A1',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  searchContainer: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#182539',
    borderWidth: 1,
    borderColor: '#20344F',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#CFDEF1',
    fontSize: 14,
    lineHeight: 18,
    paddingVertical: 8,
  },
  scopeToggleButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#27476D',
    backgroundColor: '#132742',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  scopeToggleButtonActive: {
    borderColor: '#137FEC',
    backgroundColor: '#18406B',
  },
  scopeLabel: {
    color: '#BBD1EC',
    fontSize: 12,
    fontWeight: '700',
  },
  monthLabel: {
    color: '#137FEC',
    fontSize: 28 / 1.5,
    lineHeight: 32 / 1.5,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 24,
  },
  helper: {
    color: '#93A9C5',
  },
  timelineTrackWrap: {
    flex: 1,
  },
  timelineScrollContent: {
    paddingBottom: 120,
  },
  track: {
    position: 'absolute',
    left: 22,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#25344C',
  },
  list: {
    gap: 14,
    paddingBottom: 8,
    position: 'relative',
  },
  timelineItemWrap: {
    marginLeft: 14,
    paddingLeft: 18,
  },
  dot: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#41556F',
    borderWidth: 3,
    borderColor: '#101922',
    zIndex: 2,
  },
  dotActive: {
    backgroundColor: '#137FEC',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A3760',
    backgroundColor: '#0E1931',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardBody: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardMeta: {
    color: '#93A5C2',
    fontSize: 14 / 1.5,
    lineHeight: 18 / 1.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#E3ECF8',
    fontSize: 36 / 1.5,
    lineHeight: 40 / 1.5,
    fontWeight: '800',
    marginBottom: 5,
  },
  cardDoctor: {
    color: '#D4E2F3',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    backgroundColor: '#1B2D4B',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#76AEEA',
    fontSize: 10,
    fontWeight: '800',
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#25364E',
  },
});
