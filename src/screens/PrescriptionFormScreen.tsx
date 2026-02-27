import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import {
  autoThemeColor,
  createAutoThemedStyles,
  useAutoThemeColor,
  useAutoThemedStyles,
  useResolvedThemeMode,
} from '@/src/theme/auto-theme';
import { useTranslation } from '@/src/i18n/LocaleProvider';
import { resolveE2EFixtureUri } from '@/src/utils/e2eFixture';

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

const VISIT_DATE_MIN = '2026-01-01';
const VISIT_DATE_MIN_DATE = new Date(2026, 0, 1);
const VISIT_DATE_ABSOLUTE_MAX = '2026-12-31';
const VISIT_DATE_ABSOLUTE_MAX_DATE = new Date(2026, 11, 31);

const getVisitDateMax = (): string => {
  const today = formatDate(new Date());
  if (today < VISIT_DATE_MIN) {
    return VISIT_DATE_MIN;
  }

  return today < VISIT_DATE_ABSOLUTE_MAX ? today : VISIT_DATE_ABSOLUTE_MAX;
};

const getVisitDateMaxDate = (): Date => {
  const max = getVisitDateMax();
  const parsed = parseVisitDate(max);
  return parsed ?? VISIT_DATE_ABSOLUTE_MAX_DATE;
};

const isVisitDateInAllowedRange = (value: string): boolean => {
  return value >= VISIT_DATE_MIN && value <= getVisitDateMax();
};

const getDefaultVisitDate = (): string => {
  const today = formatDate(new Date());
  return isVisitDateInAllowedRange(today) ? today : VISIT_DATE_MIN;
};

const parseVisitDate = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPickerDateValue = (value: string): Date => {
  const parsed = parseVisitDate(value);
  if (!parsed) {
    return VISIT_DATE_MIN_DATE;
  }

  if (parsed < VISIT_DATE_MIN_DATE) {
    return VISIT_DATE_MIN_DATE;
  }

  const maxDate = getVisitDateMaxDate();
  if (parsed > maxDate) {
    return maxDate;
  }

  return parsed;
};

export function PrescriptionFormScreen({ mode, prescriptionId }: PrescriptionFormScreenProps) {
  const styles = useAutoThemedStyles(screenStyles);
  const color = useAutoThemeColor();
  const themeMode = useResolvedThemeMode();
  const { t } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const isEditMode = mode === 'edit';
  const title = mode === 'edit' ? t('prescriptionForm.editTitle') : t('prescriptionForm.addTitle');
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
  const [visitDate, setVisitDate] = useState(getDefaultVisitDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const localizeMaybeKey = (value: string): string =>
    value.startsWith('validation.') || value.startsWith('prescriptionForm.') ? t(value) : value;

  const parsedTags = useMemo(() => parseTagInput(tagsInput), [tagsInput]);
  const hasSelectedPhoto = photoUri.trim().length > 0 && photoUri.trim() !== 'e2e-fixture';
  const photoUriInputValue = photoUri.trim() === 'e2e-fixture' ? photoUri : '';
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
            setMessage(t('prescriptionForm.notFound'));
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
          setMessage(error instanceof Error ? error.message : t('prescriptionForm.loadPatientsFailed'));
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
  }, [boundaries, isEditMode, prescriptionId, t]);

  const onPickPhoto = async (source: 'camera' | 'library') => {
    setMessage('');
    setErrors((current) => ({ ...current, photoUri: '' }));

    try {
      const selectedUri = await pickPrescriptionPhoto(boundaries, source);
      if (!selectedUri) {
        setMessage(t('prescriptionForm.noPhotoSelected'));
        return;
      }

      setPhotoUri(selectedUri);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('prescriptionForm.pickImageFailed'));
    }
  };

  const onSave = async () => {
    if (isLoading) {
      return;
    }

    if (isEditMode && !prescriptionId) {
      setMessage(t('prescriptionForm.notFound'));
      return;
    }

    setSaving(true);
    setMessage('');
    setErrors({});

    try {
      const isE2EFixtureSave = photoUri.trim() === 'e2e-fixture';
      const effectivePhotoUri =
        isE2EFixtureSave ? await resolveE2EFixtureUri() : photoUri.trim();
      const draft = {
        patientId,
        photoUri: effectivePhotoUri,
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
          setMessage(localizeMaybeKey(result.errors.prescriptionId));
        }
        return;
      }

      setErrors({});

      if (!isE2EFixtureSave) {
        Alert.alert(
          isEditMode ? t('prescriptionForm.saveSuccessTitleEdit') : t('prescriptionForm.saveSuccessTitleAdd'),
          isEditMode ? t('prescriptionForm.saveSuccessBodyEdit') : t('prescriptionForm.saveSuccessBodyAdd')
        );
      }
      router.replace({
        pathname: '/prescription-detail',
        params: { id: result.prescription.id },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('prescriptionForm.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const onNativeDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setVisitDate(formatDate(selectedDate));
    setErrors((current) => ({ ...current, visitDate: '' }));
  };

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} testID="prescription-form-screen">
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helper}>{t('prescriptionForm.loading')}</ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerLeft} onPress={navigateBack} hitSlop={10} testID="prescription-form-back">
          <MaterialIcons name="arrow-back-ios-new" size={18} color={color('#E1EBF8')} />
          <ThemedText type="title" style={styles.headerTitle}>
            {title}
          </ThemedText>
        </Pressable>
        <Pressable onPress={navigateBack} hitSlop={10} testID="prescription-form-cancel">
          <ThemedText style={styles.cancelLabel}>{t('prescriptionForm.cancel')}</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} testID="prescription-form-screen" showsVerticalScrollIndicator={false}>
        {message ? <ThemedText style={styles.message}>{localizeMaybeKey(message)}</ThemedText> : null}

        <ThemedView style={styles.photoSection} testID="prescription-form-photo">
          <ThemedText style={styles.sectionLabel}>{t('prescriptionForm.photoSection')}</ThemedText>
          {hasSelectedPhoto ? (
            <View style={styles.photoPreviewCard} testID="prescription-photo-preview">
              <Image source={{ uri: photoUri.trim() }} style={styles.photoPreviewImage} resizeMode="cover" />
              <View style={styles.photoActions}>
                <Pressable
                  style={[styles.galleryButton, styles.photoButton]}
                  onPress={() => onPickPhoto('library')}
                  testID="pick-photo-library"
                >
                  <MaterialIcons name="photo-library" size={16} color={color('#137FEC')} />
                  <ThemedText style={styles.galleryText}>{t('prescriptionForm.gallery')}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.cameraButton, styles.photoButton]}
                  onPress={() => onPickPhoto('camera')}
                  testID="pick-photo-camera"
                >
                  <MaterialIcons name="photo-camera" size={16} color={color('#EAF4FF')} />
                  <ThemedText style={styles.cameraText}>{t('prescriptionForm.camera')}</ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.helperInline}>Selected photo preview</ThemedText>
            </View>
          ) : (
            <View style={styles.photoUploadCard}>
              <MaterialIcons name="add-a-photo" size={38} color={color('#137FEC')} />
              <ThemedText type="subtitle" style={styles.uploadTitle}>
                {t('prescriptionForm.uploadTitle')}
              </ThemedText>
              <ThemedText style={styles.uploadSub}>{t('prescriptionForm.uploadSubtitle')}</ThemedText>
              <View style={styles.photoActions}>
                <Pressable
                  style={[styles.galleryButton, styles.photoButton]}
                  onPress={() => onPickPhoto('library')}
                  testID="pick-photo-library"
                >
                  <MaterialIcons name="photo-library" size={16} color={color('#137FEC')} />
                  <ThemedText style={styles.galleryText}>{t('prescriptionForm.gallery')}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.cameraButton, styles.photoButton]}
                  onPress={() => onPickPhoto('camera')}
                  testID="pick-photo-camera"
                >
                  <MaterialIcons name="photo-camera" size={16} color={color('#EAF4FF')} />
                  <ThemedText style={styles.cameraText}>{t('prescriptionForm.camera')}</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          <TextInput
            placeholder={hasSelectedPhoto ? 'Photo selected' : t('prescriptionForm.photoUriPlaceholder')}
            placeholderTextColor={color('#738BAA')}
            value={photoUriInputValue}
            onChangeText={setPhotoUri}
            autoCapitalize="none"
            style={styles.input}
            testID="prescription-photo-uri-input"
          />
          {hasSelectedPhoto ? <ThemedText style={styles.helperInline}>Photo selected and ready to save.</ThemedText> : null}
          {errors.photoUri ? <ThemedText style={styles.error}>{localizeMaybeKey(errors.photoUri)}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.section} testID="prescription-form-fields">
          <ThemedText style={styles.sectionLabel}>{t('prescriptionForm.detailsSection')}</ThemedText>

          <ThemedText style={styles.label}>{t('prescriptionForm.doctorNameLabel')}</ThemedText>
          <View style={styles.inputIconWrap}>
            <TextInput
              placeholder={t('prescriptionForm.doctorNamePlaceholder')}
              placeholderTextColor={color('#738BAA')}
              value={doctorName}
              onChangeText={setDoctorName}
              style={[styles.input, styles.inputWithIcon]}
              testID="prescription-doctor-input"
            />
            <MaterialIcons name="person" size={18} color={color('#92A8C2')} style={styles.inputIcon} />
          </View>
          {errors.doctorName ? <ThemedText style={styles.error}>{localizeMaybeKey(errors.doctorName)}</ThemedText> : null}

          <ThemedText style={styles.label}>{t('prescriptionForm.conditionLabel')}</ThemedText>
          <TextInput
            placeholder={t('prescriptionForm.conditionPlaceholder')}
            placeholderTextColor={color('#738BAA')}
            value={condition}
            onChangeText={setCondition}
            style={styles.input}
            testID="prescription-condition-input"
          />
          {errors.condition ? <ThemedText style={styles.error}>{localizeMaybeKey(errors.condition)}</ThemedText> : null}

          <ThemedText style={styles.label}>{t('prescriptionForm.visitDateLabel')}</ThemedText>
          <View style={styles.inputIconWrap}>
            {Platform.OS === 'web' ? (
              <View style={styles.webDateInputFrame}>
                <input
                  type="date"
                  value={visitDate}
                  min={VISIT_DATE_MIN}
                  max={getVisitDateMax()}
                  onChange={(event) => setVisitDate(event.currentTarget.value)}
                  data-testid="prescription-visit-date-value"
                  aria-label={t('prescriptionForm.dateAriaLabel')}
                  style={getWebDateInputStyle(themeMode)}
                />
              </View>
            ) : (
              <Pressable onPress={() => setShowDatePicker((current) => !current)} testID="visit-date-open-picker">
                <ThemedText style={[styles.input, styles.datePress]} testID="prescription-visit-date-value">
                  {visitDate}
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => setVisitDate(getDefaultVisitDate())}
              testID="visit-date-today"
              style={styles.inputIconAction}
            >
              <MaterialIcons name="calendar-today" size={18} color={color('#92A8C2')} />
            </Pressable>
          </View>
          {Platform.OS !== 'web' && showDatePicker ? (
            <View style={styles.datePickerPanel} testID="prescription-visit-date-picker">
              <DateTimePicker
                value={getPickerDateValue(visitDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={VISIT_DATE_MIN_DATE}
                maximumDate={getVisitDateMaxDate()}
                onChange={onNativeDateChange}
                {...(Platform.OS === 'ios'
                  ? {
                      themeVariant: themeMode,
                      accentColor: color('#137FEC'),
                    }
                  : {
                      design: 'material' as const,
                    })}
              />
            </View>
          ) : null}
          <ThemedText style={styles.helperInline}>{t('prescriptionForm.visitDateHelper')}</ThemedText>
          {errors.visitDate ? <ThemedText style={styles.error}>{localizeMaybeKey(errors.visitDate)}</ThemedText> : null}

          <ThemedText style={styles.label}>{t('prescriptionForm.specialtyLabel')}</ThemedText>
          <TextInput
            placeholder={t('prescriptionForm.specialtyPlaceholder')}
            placeholderTextColor={color('#738BAA')}
            value={doctorSpecialty}
            onChangeText={setDoctorSpecialty}
            style={styles.input}
            testID="prescription-specialty-input"
          />

          <ThemedText style={styles.label}>{t('prescriptionForm.tagsLabel')}</ThemedText>
          <TextInput
            placeholder={t('prescriptionForm.tagsPlaceholder')}
            placeholderTextColor={color('#738BAA')}
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
          {errors.tags ? <ThemedText style={styles.error}>{localizeMaybeKey(errors.tags)}</ThemedText> : null}

          <ThemedText style={styles.label}>{t('prescriptionForm.notesLabel')}</ThemedText>
          <TextInput
            placeholder={t('prescriptionForm.notesPlaceholder')}
            placeholderTextColor={color('#738BAA')}
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            multiline
            testID="prescription-notes-input"
          />
        </ThemedView>
      </ScrollView>

      <View style={styles.footer}>
        <ThemedText style={styles.footerNote}>{t('prescriptionForm.footerNote')}</ThemedText>
        <Pressable
          style={[styles.saveButton, (saving || isLoading) && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={saving || isLoading}
          testID="prescription-save-button"
        >
          <MaterialIcons name="save" size={20} color={color('#EEF6FF')} />
          <ThemedText type="defaultSemiBold" style={styles.saveButtonLabel}>
            {saving
              ? t('common.saving')
              : mode === 'edit'
                ? t('prescriptionForm.saveEdit')
                : t('prescriptionForm.saveAdd')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const screenStyles = createAutoThemedStyles({
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
  helperInline: {
    color: '#93A8C4',
    fontSize: 12,
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
  photoPreviewCard: {
    borderWidth: 1,
    borderColor: '#244061',
    borderRadius: 12,
    backgroundColor: '#0E1E33',
    padding: 10,
    gap: 8,
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#1A2638',
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
  webDateInputFrame: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#244061',
    backgroundColor: '#1A2638',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingRight: 40,
  },
  datePickerPanel: {
    borderWidth: 1,
    borderColor: '#284565',
    borderRadius: 10,
    backgroundColor: '#121F30',
    overflow: 'hidden',
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

const getWebDateInputStyle = (mode: 'light' | 'dark') =>
  ({
    width: '100%',
    minHeight: 48,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: autoThemeColor('#EAF3FF', mode),
    fontSize: 16,
  }) as const;
