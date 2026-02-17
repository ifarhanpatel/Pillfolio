import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { listPatients } from "@/src/db/patients";
import type { Patient } from "@/src/db/types";
import {
  addPrescription,
  createAppBoundaries,
  ensureDefaultPatient,
  parseTagInput,
  pickPrescriptionPhoto,
} from "@/src/services";

export type PrescriptionFormMode = "add" | "edit";

type PrescriptionFormScreenProps = {
  mode: PrescriptionFormMode;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateOptions = (today: Date, daysBefore: number, daysAfter: number): string[] => {
  const options: string[] = [];

  for (let offset = -daysBefore; offset <= daysAfter; offset += 1) {
    const value = new Date(today);
    value.setDate(today.getDate() + offset);
    options.push(formatDate(value));
  }

  return options;
};

export function PrescriptionFormScreen({ mode }: PrescriptionFormScreenProps) {
  const title = mode === "edit" ? "Edit Prescription" : "Add Prescription";
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [condition, setCondition] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visitDate, setVisitDate] = useState(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedTags = useMemo(() => parseTagInput(tagsInput), [tagsInput]);
  const dateOptions = useMemo(() => buildDateOptions(new Date(), 30, 30), []);

  useEffect(() => {
    let active = true;

    const loadPatients = async () => {
      try {
        const defaultPatientId = await ensureDefaultPatient(boundaries);
        const driver = await boundaries.db.open();
        await boundaries.db.initialize(driver);
        const rows = await listPatients(driver);

        if (!active) {
          return;
        }

        setPatients(rows);
        setPatientId((current) => current || defaultPatientId);
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Unable to load patients.");
        }
      }
    };

    loadPatients();

    return () => {
      active = false;
    };
  }, [boundaries]);

  const onPickPhoto = async (source: "camera" | "library") => {
    setMessage("");
    setErrors((current) => ({ ...current, photoUri: "" }));

    try {
      const selectedUri = await pickPrescriptionPhoto(boundaries, source);
      if (!selectedUri) {
        setMessage("No photo was selected.");
        return;
      }

      setPhotoUri(selectedUri);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to pick image.");
    }
  };

  const onSave = async () => {
    if (__DEV__) {
      console.log("[PrescriptionForm] save:start", {
        mode,
        patientId,
        hasPhotoUri: Boolean(photoUri.trim()),
        doctorNameLength: doctorName.trim().length,
        conditionLength: condition.trim().length,
        tagsCount: parsedTags.length,
        visitDate,
      });
    }

    setSaving(true);
    setMessage("");

    try {
      const result = await addPrescription(boundaries, {
        patientId,
        photoUri,
        doctorName,
        doctorSpecialty,
        condition,
        tags: parsedTags,
        visitDate,
        notes,
      });

      if (!result.ok) {
        if (__DEV__) {
          console.log("[PrescriptionForm] save:validation-failed", result.errors);
        }
        setErrors(result.errors);
        return;
      }

      setErrors({});
      if (__DEV__) {
        console.log("[PrescriptionForm] save:success", { id: result.prescription.id });
      }
      Alert.alert("Prescription Saved", "Prescription was saved successfully.");
      router.push({
        pathname: "/prescription-detail",
        params: { id: result.prescription.id },
      });
    } catch (error) {
      if (__DEV__) {
        console.log("[PrescriptionForm] save:exception", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      setMessage(error instanceof Error ? error.message : "Unable to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} testID="prescription-form-screen">
      <ThemedView style={styles.container}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText type="default">Capture visit details and attach a photo.</ThemedText>

        {message ? (
          <ThemedText type="defaultSemiBold" style={styles.message}>
            {message}
          </ThemedText>
        ) : null}

        <ThemedView style={styles.section} testID="prescription-form-photo">
          <ThemedText type="subtitle">Photo</ThemedText>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => onPickPhoto("camera")}
              testID="pick-photo-camera"
            >
              <ThemedText type="defaultSemiBold">Use Camera</ThemedText>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => onPickPhoto("library")}
              testID="pick-photo-library"
            >
              <ThemedText type="defaultSemiBold">Open Gallery</ThemedText>
            </Pressable>
          </View>
          <TextInput
            placeholder="Photo URI"
            value={photoUri}
            onChangeText={setPhotoUri}
            autoCapitalize="none"
            style={styles.input}
            testID="prescription-photo-uri-input"
          />
          {errors.photoUri ? <ThemedText style={styles.error}>{errors.photoUri}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.section} testID="prescription-form-fields">
          <ThemedText type="subtitle">Details</ThemedText>

          <ThemedText style={styles.label}>Patient</ThemedText>
          <View style={styles.patientRow}>
            {patients.map((patient) => {
              const selected = patient.id === patientId;
              return (
                <Pressable
                  key={patient.id}
                  style={[styles.patientChip, selected ? styles.patientChipSelected : null]}
                  onPress={() => setPatientId(patient.id)}
                  testID={`patient-option-${patient.id}`}
                >
                  <ThemedText type="defaultSemiBold">{patient.name}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {errors.patientId ? <ThemedText style={styles.error}>{errors.patientId}</ThemedText> : null}

          <ThemedText style={styles.label}>Doctor Name</ThemedText>
          <TextInput
            placeholder="Dr. Lee"
            value={doctorName}
            onChangeText={setDoctorName}
            style={styles.input}
            testID="prescription-doctor-input"
          />
          {errors.doctorName ? <ThemedText style={styles.error}>{errors.doctorName}</ThemedText> : null}

          <ThemedText style={styles.label}>Specialty (optional)</ThemedText>
          <TextInput
            placeholder="Cardiology"
            value={doctorSpecialty}
            onChangeText={setDoctorSpecialty}
            style={styles.input}
            testID="prescription-specialty-input"
          />

          <ThemedText style={styles.label}>Condition</ThemedText>
          <TextInput
            placeholder="Hypertension"
            value={condition}
            onChangeText={setCondition}
            style={styles.input}
            testID="prescription-condition-input"
          />
          {errors.condition ? <ThemedText style={styles.error}>{errors.condition}</ThemedText> : null}

          <ThemedText style={styles.label}>Tags (comma-separated)</ThemedText>
          <TextInput
            placeholder="bp, daily"
            value={tagsInput}
            onChangeText={setTagsInput}
            style={styles.input}
            testID="prescription-tags-input"
          />
          {parsedTags.length > 0 ? (
            <View style={styles.tagRow} testID="prescription-tag-chips">
              {parsedTags.map((tag) => (
                <View key={tag.toLowerCase()} style={styles.tagChip}>
                  <ThemedText type="defaultSemiBold">{tag}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          {errors.tags ? <ThemedText style={styles.error}>{errors.tags}</ThemedText> : null}

          <ThemedText style={styles.label}>Visit Date</ThemedText>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setVisitDate(formatDate(new Date()))}
              testID="visit-date-today"
            >
              <ThemedText type="defaultSemiBold">Today</ThemedText>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setShowDatePicker((current) => !current)}
              testID="visit-date-open-picker"
            >
              <ThemedText type="defaultSemiBold">Pick Date</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.dateValue} testID="prescription-visit-date-value">
            {visitDate}
          </ThemedText>
          {showDatePicker ? (
            <View style={styles.datePickerPanel} testID="prescription-visit-date-picker">
              <ScrollView style={styles.datePickerList} nestedScrollEnabled>
                {dateOptions.map((dateOption) => (
                  <Pressable
                    key={dateOption}
                    style={[
                      styles.dateOption,
                      dateOption === visitDate ? styles.dateOptionSelected : null,
                    ]}
                    onPress={() => {
                      setVisitDate(dateOption);
                      setShowDatePicker(false);
                    }}
                    testID={`visit-date-option-${dateOption}`}
                  >
                    <ThemedText type="defaultSemiBold">{dateOption}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {errors.visitDate ? <ThemedText style={styles.error}>{errors.visitDate}</ThemedText> : null}

          <ThemedText style={styles.label}>Notes</ThemedText>
          <TextInput
            placeholder="Optional notes"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            multiline
            testID="prescription-notes-input"
          />

          <Pressable
            style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
            onPress={onSave}
            disabled={saving}
            testID="prescription-save-button"
          >
            <ThemedText type="defaultSemiBold">
              {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Prescription"}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  dateValue: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  datePickerPanel: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    maxHeight: 220,
    backgroundColor: "#ffffff",
  },
  datePickerList: {
    padding: 8,
  },
  dateOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dateOptionSelected: {
    backgroundColor: "#dbeafe",
  },
  container: {
    padding: 24,
    gap: 12,
  },
  section: {
    marginTop: 8,
    gap: 8,
  },
  message: {
    color: "#b45309",
  },
  label: {
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  error: {
    color: "#dc2626",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  patientRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  patientChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#94a3b8",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  patientChipSelected: {
    backgroundColor: "#bfdbfe",
    borderColor: "#60a5fa",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#e2e8f0",
  },
});
