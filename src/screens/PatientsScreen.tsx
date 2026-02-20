import { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDb, openDb } from '@/src/db';
import { deletePatientWithStrategy, listPatients } from '@/src/db/patients';
import type { Patient, PatientListItem } from '@/src/db/types';

const toPatientTestKey = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function PatientsScreen() {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Patient | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const driver = await openDb();
      await initializeDb(driver);
      const items = await listPatients(driver);
      setPatients(items);
    } catch {
      setPatients([]);
      setErrorMessage('Unable to load patients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPatients();
    }, [loadPatients])
  );

  const reassignCandidates = useMemo(() => {
    if (!deleteCandidate) {
      return [];
    }

    return patients.filter((patient) => patient.id !== deleteCandidate.id);
  }, [deleteCandidate, patients]);

  const openDeleteModal = (patient: Patient) => {
    setDeleteCandidate(patient);
    const firstTarget = patients.find((item) => item.id !== patient.id);
    setReassignTargetId(firstTarget?.id ?? null);
  };

  const closeDeleteModal = () => {
    setDeleteCandidate(null);
    setReassignTargetId(null);
  };

  const confirmDeleteAll = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);
    try {
      const driver = await openDb();
      await initializeDb(driver);
      await deletePatientWithStrategy(driver, deleteCandidate.id, {
        type: 'delete-all',
      });
      closeDeleteModal();
      await loadPatients();
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmReassign = async () => {
    if (!deleteCandidate || !reassignTargetId) {
      return;
    }

    setIsDeleting(true);
    try {
      const driver = await openDb();
      await initializeDb(driver);
      await deletePatientWithStrategy(driver, deleteCandidate.id, {
        type: 'reassign',
        targetPatientId: reassignTargetId,
      });
      closeDeleteModal();
      await loadPatients();
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshPatients = async () => {
    setIsRefreshing(true);
    try {
      await loadPatients();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="patients-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshPatients()}
            tintColor="#137FEC"
          />
        }
      >
        <ThemedText style={styles.srOnly}>Patients</ThemedText>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Family Profiles
            </ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              Managed locally · Private
            </ThemedText>
          </View>
        </View>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#7086A8" />
          <ThemedText style={styles.searchPlaceholder}>Search profiles...</ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addPatientButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/add-edit-patient')}
          testID="patients-cta"
        >
          <ThemedText style={styles.addPatientButtonText}>Add Patient</ThemedText>
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#137FEC" />
          </View>
        ) : null}

        {!isLoading && patients.length === 0 ? (
          <ThemedView style={styles.emptyState} testID="patients-empty-state">
            <ThemedText type="default" style={styles.emptyText}>
              {errorMessage ?? 'No patients yet.'}
            </ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading ? (
          <View style={styles.list} testID="patients-list">
            {patients.map((patient, index) => (
              <ThemedView
                key={patient.id}
                style={styles.card}
                testID={`patient-card-${toPatientTestKey(patient.name)}`}
              >
                <View style={styles.cardRow}>
                  <Pressable
                    style={styles.cardPressArea}
                    onPress={() =>
                      router.push({ pathname: '/add-edit-patient', params: { id: patient.id } })
                    }
                    testID={`patient-edit-${toPatientTestKey(patient.name)}`}
                  >
                    <View style={styles.avatarCircle}>
                      <ThemedText style={styles.avatarLabel}>
                        {patient.name.slice(0, 1).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.nameRow}>
                        <ThemedText type="subtitle" style={styles.cardName}>
                          {patient.name}
                        </ThemedText>
                        {index === 0 ? (
                          <View style={styles.primaryPill}>
                            <ThemedText style={styles.primaryPillText}>PRIMARY</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText style={styles.cardRelation}>
                        {patient.relationship ? patient.relationship : 'You'}
                      </ThemedText>
                      <ThemedText style={styles.cardMeta}>
                        <MaterialIcons name="description" size={12} color="#137FEC" />{' '}
                        {patient.prescriptionsCount}{' '}
                        {patient.prescriptionsCount === 1 ? 'Prescription' : 'Prescriptions'}
                      </ThemedText>
                    </View>
                  </Pressable>
                  <View style={styles.cardActions}>
                    <MaterialIcons name="chevron-right" size={20} color="#415777" />
                    <Pressable
                      onPress={() => openDeleteModal(patient)}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
                      testID={`patient-delete-${toPatientTestKey(patient.name)}`}
                    >
                      <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </ThemedView>
            ))}
          </View>
        ) : null}

        <View style={styles.footerBadge}>
          <MaterialIcons name="verified-user" size={14} color="#5E7290" />
          <ThemedText style={styles.footerText}>End-to-end local encryption active</ThemedText>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 14 }]}
        onPress={() => router.push('/add-edit-prescription?mode=add')}
        testID="patients-add-prescription-cta"
      >
        <MaterialIcons name="add" size={34} color="#F3F9FF" />
      </Pressable>

      <Modal
        visible={Boolean(deleteCandidate)}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <ThemedView style={styles.modalBackdrop} testID="delete-patient-modal">
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Delete patient
            </ThemedText>
            <ThemedText type="default" style={styles.modalText}>
              Choose whether to delete all prescriptions or reassign them first.
            </ThemedText>

            <Pressable
              onPress={() => void confirmDeleteAll()}
              style={({ pressed }) => [styles.modalButton, pressed && styles.buttonPressed]}
              disabled={isDeleting}
              testID="delete-patient-delete-all-button"
            >
              <ThemedText style={styles.modalButtonLabel}>
                {isDeleting ? 'Working...' : 'Delete all prescriptions'}
              </ThemedText>
            </Pressable>

            <ThemedText style={styles.modalSection}>Reassign prescriptions</ThemedText>
            <ThemedView style={styles.reassignGroup}>
              {reassignCandidates.length === 0 ? (
                <ThemedText style={styles.modalText} testID="delete-patient-no-reassign-targets">
                  Add another patient to reassign prescriptions.
                </ThemedText>
              ) : (
                reassignCandidates.map((patient) => (
                  <Pressable
                    key={patient.id}
                    onPress={() => setReassignTargetId(patient.id)}
                    style={({ pressed }) => [
                      styles.reassignOption,
                      reassignTargetId === patient.id && styles.reassignOptionSelected,
                      pressed && styles.buttonPressed,
                    ]}
                    testID={`delete-patient-reassign-target-${patient.id}`}
                  >
                    <ThemedText style={styles.modalText}>
                      {reassignTargetId === patient.id ? 'Selected: ' : ''}
                      {patient.name}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </ThemedView>

            <Pressable
              onPress={() => void confirmReassign()}
              style={({ pressed }) => [styles.modalButton, pressed && styles.buttonPressed]}
              disabled={isDeleting || !reassignTargetId}
              testID="delete-patient-reassign-button"
            >
              <ThemedText style={styles.modalButtonLabel}>Reassign and delete patient</ThemedText>
            </Pressable>

            <Pressable
              onPress={closeDeleteModal}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
              disabled={isDeleting}
              testID="delete-patient-cancel-button"
            >
              <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101922',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 14,
  },
  srOnly: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#E8EEF7',
    fontSize: 46 / 1.5,
    lineHeight: 52 / 1.5,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8494AA',
    fontSize: 18 / 1.5,
    lineHeight: 26 / 1.5,
    marginTop: 2,
  },
  searchBar: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#111E31',
    borderWidth: 1,
    borderColor: '#1A2B44',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPlaceholder: {
    color: '#667B9B',
    fontSize: 16,
    lineHeight: 20,
  },
  addPatientButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2A3D59',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#0F1D2F',
  },
  addPatientButtonText: {
    color: '#A5BCD7',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: 20,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#1B2F4D',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#0E1B2D',
  },
  emptyText: {
    color: '#9CB0CA',
  },
  list: {
    gap: 14,
    paddingBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#123765',
    borderRadius: 16,
    backgroundColor: '#0C1630',
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#23344A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    color: '#DFEAF9',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 20,
  },
  cardBody: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    color: '#E3ECF9',
    fontSize: 35 / 1.5,
    lineHeight: 38 / 1.5,
  },
  primaryPill: {
    backgroundColor: 'rgba(19,127,236,0.2)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryPillText: {
    color: '#137FEC',
    fontSize: 10,
    fontWeight: '800',
  },
  cardRelation: {
    color: '#99ACC6',
    marginTop: 1,
  },
  cardMeta: {
    color: '#137FEC',
    marginTop: 5,
    fontSize: 13,
    lineHeight: 16,
  },
  cardActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginLeft: 8,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334A68',
    backgroundColor: '#15243A',
  },
  deleteButtonText: {
    color: '#A7BCD5',
    fontSize: 12,
    fontWeight: '700',
  },
  footerBadge: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#5E7290',
    fontSize: 12,
    lineHeight: 14,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 84,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#137FEC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#137FEC',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(2, 5, 10, 0.72)',
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    backgroundColor: '#0E1B2D',
    borderWidth: 1,
    borderColor: '#1A2F4A',
  },
  modalTitle: {
    color: '#E3EDFA',
  },
  modalText: {
    color: '#A8BCD5',
  },
  modalButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D4768',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#14253A',
  },
  modalButtonLabel: {
    color: '#D8E7F8',
    fontWeight: '700',
  },
  modalSection: {
    color: '#D2E2F6',
    fontWeight: '700',
    marginTop: 2,
  },
  reassignGroup: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  reassignOption: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#294463',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#112134',
  },
  reassignOptionSelected: {
    borderColor: '#137FEC',
    backgroundColor: '#163961',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLabel: {
    color: '#97AECA',
  },
  buttonPressed: {
    opacity: 0.86,
  },
});
