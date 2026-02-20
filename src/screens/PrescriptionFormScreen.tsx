import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listPatients } from '@/src/db/patients';
import { getPrescriptionById } from '@/src/db/prescriptions';
import type { Patient } from '@/src/db/types';
import {
  addPrescription,
  createAppBoundaries,
  editPrescription,
  ensureDefaultPatient,
  parseTagInput,
  pickPrescriptionPhoto,
} from '@/src/services';

export type PrescriptionFormMode = 'add' | 'edit';

type PrescriptionFormScreenProps = {
  mode: PrescriptionFormMode;
  prescriptionId?: string;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

export function PrescriptionFormScreen({ mode, prescriptionId }: PrescriptionFormScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const isEditMode = mode === 'edit';
  const title = mode === 'edit' ? 'Edit Prescription' : 'Add Prescription';
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [condition, setCondition] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visitDate, setVisitDate] = useState(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedTags = useMemo(() => parseTagInput(tagsInput), [tagsInput]);
  const dateOptions = useMemo(() => buildDateOptions(new Date(), 30, 30), []);
  const navigateBack = () => {
    const canGoBack = (router as { canGoBack?: () => boolean }).canGoBack?.() ?? false;
    if (canGoBack) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  };

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
        if (isEditMode && prescriptionId) {
          const existing = await getPrescriptionById(driver, prescriptionId);
          if (!existing) {
            setMessage('Prescription not found.');
            return;
          }

          if (!active) {
            return;
          }

          setPatientId(existing.patientId);
          setPhotoUri(existing.photoUri);
          setDoctorName(existing.doctorName);
          setDoctorSpecialty(existing.doctorSpecialty ?? '');
          setCondition(existing.condition);
          setTagsInput(existing.tags.join(', '));
          setVisitDate(existing.visitDate);
          setNotes(existing.notes ?? '');
          return;
        }

        setPatientId((current) => current || defaultPatientId);
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Unable to load patients.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPatients();

    return () => {
      active = false;
    };
  }, [boundaries, isEditMode, prescriptionId]);

  const onPickPhoto = async (source: 'camera' | 'library') => {
    setMessage('');
    setErrors((current) => ({ ...current, photoUri: '' }));

    try {
      const selectedUri = await pickPrescriptionPhoto(boundaries, source);
      if (!selectedUri) {
        setMessage('No photo was selected.');
        return;
      }

      setPhotoUri(selectedUri);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to pick image.');
    }
  };

  const onSave = async () => {
    if (isLoading) {
      return;
    }

    if (isEditMode && !prescriptionId) {
      setMessage('Prescription not found.');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrors({});

    try {
      const draft = {
        patientId,
        photoUri,
        doctorName,
        doctorSpecialty,
        condition,
        tags: parsedTags,
        visitDate,
        notes,
      };
      const result =
        isEditMode && prescriptionId
          ? await editPrescription(boundaries, {
              prescriptionId,
              ...draft,
            })
          : await addPrescription(boundaries, draft);

      if (!result.ok) {
        setErrors(result.errors);
        if (result.errors.prescriptionId) {
          setMessage(result.errors.prescriptionId);
        }
        return;
      }

      setErrors({});

      Alert.alert(
        isEditMode ? 'Prescription Updated' : 'Prescription Saved',
        isEditMode ? 'Prescription changes were saved successfully.' : 'Prescription was saved successfully.'
      );
      router.replace({
        pathname: '/prescription-detail',
        params: { id: result.prescription.id },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} testID="prescription-form-screen">
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helper}>Loading prescription...</ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerLeft} onPress={navigateBack} hitSlop={10} testID="prescription-form-back">
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#E1EBF8" />
          <ThemedText type="title" style={styles.headerTitle}>
            {title}
          </ThemedText>
        </Pressable>
        <Pressable onPress={navigateBack} hitSlop={10} testID="prescription-form-cancel">
          <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} testID="prescription-form-screen" showsVerticalScrollIndicator={false}>
        {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}

        <ThemedView style={styles.photoSection} testID="prescription-form-photo">
          <ThemedText style={styles.sectionLabel}>PRESCRIPTION PHOTO</ThemedText>
          <View style={styles.photoUploadCard}>
            <MaterialIcons name="add-a-photo" size={38} color="#137FEC" />
            <ThemedText type="subtitle" style={styles.uploadTitle}>
              Upload Prescription
            </ThemedText>
            <ThemedText style={styles.uploadSub}>Take a clear photo of the physical paper</ThemedText>
            <View style={styles.photoActions}>
              <Pressable
                style={[styles.galleryButton, styles.photoButton]}
                onPress={() => onPickPhoto('library')}
                testID="pick-photo-library"
              >
                <MaterialIcons name="photo-library" size={16} color="#137FEC" />
                <ThemedText style={styles.galleryText}>Gallery</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.cameraButton, styles.photoButton]}
                onPress={() => onPickPhoto('camera')}
                testID="pick-photo-camera"
              >
                <MaterialIcons name="photo-camera" size={16} color="#EAF4FF" />
                <ThemedText style={styles.cameraText}>Camera</ThemedText>
              </Pressable>
            </View>
          </View>

          <TextInput
            placeholder="Photo URI"
            placeholderTextColor="#738BAA"
            value={photoUri}
            onChangeText={setPhotoUri}
            autoCapitalize="none"
            style={styles.input}
            testID="prescription-photo-uri-input"
          />
          {errors.photoUri ? <ThemedText style={styles.error}>{errors.photoUri}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.section} testID="prescription-form-fields">
          <ThemedText style={styles.sectionLabel}>MEDICAL DETAILS</ThemedText>

          <ThemedText style={styles.label}>Doctor Name *</ThemedText>
          <View style={styles.inputIconWrap}>
            <TextInput
              placeholder="e.g. Dr. Rajesh Kumar"
              placeholderTextColor="#738BAA"
              value={doctorName}
              onChangeText={setDoctorName}
              style={[styles.input, styles.inputWithIcon]}
              testID="prescription-doctor-input"
            />
            <MaterialIcons name="person" size={18} color="#92A8C2" style={styles.inputIcon} />
          </View>
          {errors.doctorName ? <ThemedText style={styles.error}>{errors.doctorName}</ThemedText> : null}

          <ThemedText style={styles.label}>Condition *</ThemedText>
          <TextInput
            placeholder="e.g. Seasonal Allergy, Hypertension"
            placeholderTextColor="#738BAA"
            value={condition}
            onChangeText={setCondition}
            style={styles.input}
            testID="prescription-condition-input"
          />
          {errors.condition ? <ThemedText style={styles.error}>{errors.condition}</ThemedText> : null}

          <ThemedText style={styles.label}>Date of Visit</ThemedText>
          <View style={styles.inputIconWrap}>
            <Pressable onPress={() => setShowDatePicker((current) => !current)} testID="visit-date-open-picker">
              <ThemedText style={[styles.input, styles.datePress]} testID="prescription-visit-date-value">
                {visitDate}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setVisitDate(formatDate(new Date()))} testID="visit-date-today" style={styles.inputIconAction}>
              <MaterialIcons name="calendar-today" size={18} color="#92A8C2" />
            </Pressable>
          </View>
          {showDatePicker ? (
            <View style={styles.datePickerPanel} testID="prescription-visit-date-picker">
              <ScrollView style={styles.datePickerList} nestedScrollEnabled>
                {dateOptions.map((dateOption) => (
                  <Pressable
                    key={dateOption}
                    style={[styles.dateOption, dateOption === visitDate ? styles.dateOptionSelected : null]}
                    onPress={() => {
                      setVisitDate(dateOption);
                      setShowDatePicker(false);
                    }}
                    testID={`visit-date-option-${dateOption}`}
                  >
                    <ThemedText style={styles.dateOptionText}>{dateOption}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {errors.visitDate ? <ThemedText style={styles.error}>{errors.visitDate}</ThemedText> : null}

          <ThemedText style={styles.label}>Specialty (optional)</ThemedText>
          <TextInput
            placeholder="Cardiology"
            placeholderTextColor="#738BAA"
            value={doctorSpecialty}
            onChangeText={setDoctorSpecialty}
            style={styles.input}
            testID="prescription-specialty-input"
          />

          <ThemedText style={styles.label}>Tags & Family Member</ThemedText>
          <TextInput
            placeholder="self, dad, chronic"
            placeholderTextColor="#738BAA"
            value={tagsInput}
            onChangeText={setTagsInput}
            style={styles.input}
            testID="prescription-tags-input"
          />
          <View style={styles.tagRow} testID="prescription-tag-chips">
            {patients.map((patient) => {
              const selected = patient.id === patientId;
              return (
                <Pressable
                  key={patient.id}
                  style={[styles.patientChip, selected && styles.patientChipSelected]}
                  onPress={() => setPatientId(patient.id)}
                  testID={`patient-option-${patient.id}`}
                >
                  <ThemedText style={[styles.patientChipText, selected && styles.patientChipTextSelected]}>{patient.name}</ThemedText>
                </Pressable>
              );
            })}
            {parsedTags.map((tag) => (
              <View key={tag.toLowerCase()} style={styles.tagChip}>
                <ThemedText style={styles.tagText}>{tag}</ThemedText>
              </View>
            ))}
          </View>
          {errors.tags ? <ThemedText style={styles.error}>{errors.tags}</ThemedText> : null}

          <ThemedText style={styles.label}>Notes</ThemedText>
          <TextInput
            placeholder="Optional notes"
            placeholderTextColor="#738BAA"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            multiline
            testID="prescription-notes-input"
          />
        </ThemedView>
      </ScrollView>

      <View style={styles.footer}>
        <ThemedText style={styles.footerNote}>All data is encrypted and stored locally on your device</ThemedText>
        <Pressable
          style={[styles.saveButton, (saving || isLoading) && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={saving || isLoading}
          testID="prescription-save-button"
        >
          <MaterialIcons name="save" size={20} color="#EEF6FF" />
          <ThemedText type="defaultSemiBold" style={styles.saveButtonLabel}>
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Prescription'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101922',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2D44',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#EAF2FB',
    fontSize: 33 / 1.5,
    lineHeight: 38 / 1.5,
  },
  cancelLabel: {
    color: '#137FEC',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 160,
    paddingTop: 10,
    gap: 10,
    backgroundColor: '#101922',
  },
  container: {
    paddingTop: 16,
    backgroundColor: '#101922',
  },
  helper: {
    color: '#93A8C4',
  },
  message: {
    color: '#FFC781',
  },
  photoSection: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  section: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  sectionLabel: {
    color: '#137FEC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  photoUploadCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1A4E8D',
    borderRadius: 12,
    backgroundColor: '#0E1E33',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  uploadTitle: {
    color: '#E5EFFB',
    fontSize: 36 / 1.5,
    lineHeight: 40 / 1.5,
  },
  uploadSub: {
    color: '#94A8C2',
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  galleryButton: {
    backgroundColor: '#132D4C',
  },
  cameraButton: {
    backgroundColor: '#137FEC',
  },
  galleryText: {
    color: '#137FEC',
    fontWeight: '700',
  },
  cameraText: {
    color: '#EAF4FF',
    fontWeight: '700',
  },
  label: {
    color: '#DCE8F8',
    fontSize: 17 / 1.5,
    lineHeight: 22 / 1.5,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#244061',
    paddingHorizontal: 14,
    color: '#EAF3FF',
    backgroundColor: '#1A2638',
    fontSize: 16,
    lineHeight: 20,
  },
  inputWithIcon: {
    paddingRight: 40,
  },
  inputIconWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  inputIconAction: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  datePress: {
    textAlignVertical: 'center',
    paddingTop: 14,
  },
  datePickerPanel: {
    borderWidth: 1,
    borderColor: '#284565',
    borderRadius: 10,
    maxHeight: 220,
    backgroundColor: '#121F30',
  },
  datePickerList: {
    padding: 8,
  },
  dateOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dateOptionSelected: {
    backgroundColor: '#18406B',
  },
  dateOptionText: {
    color: '#D8E7F8',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patientChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#325275',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#162438',
  },
  patientChipSelected: {
    borderColor: '#137FEC',
    backgroundColor: 'rgba(19,127,236,0.18)',
  },
  patientChipText: {
    color: '#A8BED8',
    fontSize: 12,
    fontWeight: '700',
  },
  patientChipTextSelected: {
    color: '#4AB0FF',
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: '#273447',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#B8CBE1',
    fontSize: 11,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  error: {
    color: '#F3A8AE',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#101922',
    borderTopWidth: 1,
    borderTopColor: '#1E2D44',
    gap: 8,
  },
  footerNote: {
    color: '#607693',
    fontSize: 11,
    textAlign: 'center',
  },
  saveButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#137FEC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonLabel: {
    color: '#EEF6FF',
    fontSize: 18 / 1.5,
    lineHeight: 22 / 1.5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
