import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initializeDb, openDb } from "@/src/db";
import { deletePatientWithStrategy, listPatients } from "@/src/db/patients";
import type { Patient } from "@/src/db/types";

const toPatientTestKey = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Patient | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const driver = await openDb();
      await initializeDb(driver);
      const items = await listPatients(driver);
      setPatients(items);
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
        type: "delete-all",
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
        type: "reassign",
        targetPatientId: reassignTargetId,
      });
      closeDeleteModal();
      await loadPatients();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="patients-screen">
      <ThemedText type="title">Patients</ThemedText>
      <ThemedText type="default">Manage people and their prescriptions.</ThemedText>

      <Pressable
        onPress={() => router.push("/add-edit-patient")}
        style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
        testID="patients-cta"
      >
        <ThemedText type="subtitle">Add Patient</ThemedText>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.addPrescriptionButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.push("/add-edit-prescription?mode=add")}
        testID="patients-add-prescription-cta"
      >
        <ThemedText type="defaultSemiBold">Add Prescription</ThemedText>
      </Pressable>

      {isLoading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator />
        </ThemedView>
      ) : null}

      {!isLoading && patients.length === 0 ? (
        <ThemedView style={styles.emptyState} testID="patients-empty-state">
          <ThemedText type="default">No patients yet.</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading ? (
        <ScrollView contentContainerStyle={styles.list} testID="patients-list">
          {patients.map((patient) => (
            <ThemedView
              key={patient.id}
              style={styles.card}
              testID={`patient-card-${toPatientTestKey(patient.name)}`}
            >
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/add-edit-patient", params: { id: patient.id } })
                }
                testID={`patient-edit-${toPatientTestKey(patient.name)}`}
              >
                <ThemedText type="subtitle">{patient.name}</ThemedText>
                <ThemedText type="default">
                  {patient.relationship ? patient.relationship : "Relationship not set"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => openDeleteModal(patient)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
                testID={`patient-delete-${toPatientTestKey(patient.name)}`}
              >
                <ThemedText type="defaultSemiBold">Delete</ThemedText>
              </Pressable>
            </ThemedView>
          ))}
        </ScrollView>
      ) : null}

      <Modal
        visible={Boolean(deleteCandidate)}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <ThemedView style={styles.modalBackdrop} testID="delete-patient-modal">
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle">Delete patient</ThemedText>
            <ThemedText type="default">
              Choose whether to delete all prescriptions or reassign them first.
            </ThemedText>

            <Pressable
              onPress={() => void confirmDeleteAll()}
              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
              disabled={isDeleting}
              testID="delete-patient-delete-all-button"
            >
              <ThemedText type="defaultSemiBold">
                {isDeleting ? "Working..." : "Delete all prescriptions"}
              </ThemedText>
            </Pressable>

            <ThemedText type="defaultSemiBold">Reassign prescriptions</ThemedText>
            <ThemedView style={styles.reassignGroup}>
              {reassignCandidates.length === 0 ? (
                <ThemedText type="default" testID="delete-patient-no-reassign-targets">
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
                    <ThemedText type="default">
                      {reassignTargetId === patient.id ? "Selected: " : ""}
                      {patient.name}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </ThemedView>

            <Pressable
              onPress={() => void confirmReassign()}
              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
              disabled={isDeleting || !reassignTargetId}
              testID="delete-patient-reassign-button"
            >
              <ThemedText type="defaultSemiBold">Reassign and delete patient</ThemedText>
            </Pressable>

            <Pressable
              onPress={closeDeleteModal}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
              disabled={isDeleting}
              testID="delete-patient-cancel-button"
            >
              <ThemedText type="default">Cancel</ThemedText>
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
    padding: 24,
    gap: 12,
  },
  addButton: {
    borderWidth: 1,
    borderColor: "#C4C4C8",
    borderRadius: 8,
    padding: 12,
  },
  addPrescriptionButton: {
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#dbeafe",
    alignSelf: "flex-start",
  },
  loadingContainer: {
    marginTop: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: "#E3E3E8",
    borderRadius: 8,
    padding: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E3E3E8",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#D0D0D5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#C4C4C8",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  reassignGroup: {
    gap: 8,
  },
  reassignOption: {
    borderWidth: 1,
    borderColor: "#DADAE0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reassignOptionSelected: {
    borderColor: "#8A8A93",
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
