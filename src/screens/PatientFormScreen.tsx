import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDb, openDb } from '@/src/db';
import { createPatient, getPatientById, updatePatient } from '@/src/db/patients';
import { validatePatientInput } from '@/src/utils/validation';

export type PatientFormMode = 'add' | 'edit';

type PatientFormScreenProps = {
  mode: PatientFormMode;
  patientId?: string;
};

export function PatientFormScreen({ mode, patientId }: PatientFormScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const isEditMode = mode === 'edit';
  const title = useMemo(() => (isEditMode ? 'Edit Patient' : 'Add Patient'), [isEditMode]);

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
          Alert.alert('Patient not found');
          router.back();
          return;
        }

        setName(patient.name);
        setRelationship(patient.relationship ?? '');
      } catch {
        Alert.alert('Failed to load patient');
      } finally {
        setLoading(false);
      }
    };

    void loadPatient();
  }, [isEditMode, patientId]);

  const savePatient = async () => {
    const validation = validatePatientInput({ name });
    if (!validation.valid) {
      setNameError(validation.errors.name ?? 'Name is required.');
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
      Alert.alert('Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="patient-form-screen">
        <ActivityIndicator color="#7FBEFF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="patient-form-screen">
      <ThemedText type="title" style={styles.pageTitle}>
        {title}
      </ThemedText>
      <ThemedView style={styles.formCard}>
        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Name *
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Patient name"
            placeholderTextColor="#7C96B1"
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
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Relationship
          </ThemedText>
          <TextInput
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Optional"
            placeholderTextColor="#7C96B1"
            style={styles.input}
            testID="patient-form-relationship-input"
          />
        </ThemedView>
        <Pressable
          onPress={() => void savePatient()}
          style={({ pressed }) => [
            styles.primaryButton,
            saving && styles.primaryButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
          disabled={saving}
          testID="patient-form-save-button"
        >
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonLabel}>
            {saving ? 'Saving...' : 'Save Patient'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
    backgroundColor: '#07101D',
  },
  pageTitle: {
    color: '#EAF3FF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  formCard: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A4766',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#0F2237',
  },
  field: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  label: {
    color: '#C7DCF3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2C4D71',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#EAF3FF',
    backgroundColor: '#0B1A2C',
  },
  errorText: {
    color: '#FFB4B8',
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#137FEC',
  },
  primaryButtonLabel: {
    color: '#F4FAFF',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
