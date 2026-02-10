import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initializeDb, openDb } from "@/src/db";
import { createPatient, getPatientById, updatePatient } from "@/src/db/patients";
import { validatePatientInput } from "@/src/utils/validation";

export type PatientFormMode = "add" | "edit";

type PatientFormScreenProps = {
  mode: PatientFormMode;
  patientId?: string;
};

export function PatientFormScreen({ mode, patientId }: PatientFormScreenProps) {
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const isEditMode = mode === "edit";
  const title = useMemo(
    () => (isEditMode ? "Edit Patient" : "Add Patient"),
    [isEditMode]
  );

  useEffect(() => {
    const loadPatient = async () => {
      if (!isEditMode || !patientId) {
        setLoading(false);
        return;
      }

      try {
        const driver = await openDb();
        await initializeDb(driver);
        const patient = await getPatientById(driver, patientId);
        if (!patient) {
          Alert.alert("Patient not found");
          router.back();
          return;
        }

        setName(patient.name);
        setRelationship(patient.relationship ?? "");
      } catch {
        Alert.alert("Failed to load patient");
      } finally {
        setLoading(false);
      }
    };

    void loadPatient();
  }, [isEditMode, patientId]);

  const savePatient = async () => {
    const validation = validatePatientInput({ name });
    if (!validation.valid) {
      setNameError(validation.errors.name ?? "Name is required.");
      return;
    }

    setNameError(null);
    setSaving(true);

    try {
      const driver = await openDb();
      await initializeDb(driver);
      const payload = {
        name,
        relationship: relationship.trim() ? relationship.trim() : null,
      };

      if (isEditMode && patientId) {
        await updatePatient(driver, patientId, payload);
      } else {
        await createPatient(driver, payload);
      }

      router.back();
    } catch {
      Alert.alert("Failed to save patient");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container} testID="patient-form-screen">
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} testID="patient-form-screen">
      <ThemedText type="title">{title}</ThemedText>
      <ThemedView style={styles.field}>
        <ThemedText type="defaultSemiBold">Name *</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Patient name"
          style={styles.input}
          testID="patient-form-name-input"
        />
        {nameError ? (
          <ThemedText type="default" style={styles.errorText} testID="patient-form-name-error">
            {nameError}
          </ThemedText>
        ) : null}
      </ThemedView>
      <ThemedView style={styles.field}>
        <ThemedText type="defaultSemiBold">Relationship</ThemedText>
        <TextInput
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Optional"
          style={styles.input}
          testID="patient-form-relationship-input"
        />
      </ThemedView>
      <Pressable
        onPress={() => void savePatient()}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        disabled={saving}
        testID="patient-form-save-button"
      >
        <ThemedText type="defaultSemiBold">{saving ? "Saving..." : "Save Patient"}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C4C4C8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: "#B42318",
  },
  primaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BDBDC2",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
