import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FullscreenImageViewer } from '@/src/components/FullscreenImageViewer';
import { initializeDb, openDb } from '@/src/db';
import { getPatientById } from '@/src/db/patients';
import { getPrescriptionById } from '@/src/db/prescriptions';
import type { Prescription } from '@/src/db/types';
import { createAppBoundaries, deletePrescriptionWithCleanup } from '@/src/services';

type PrescriptionPreview = {
  photoUri: string;
  patientName?: string | null;
  doctorName: string;
  doctorSpecialty: string | null;
  condition: string;
  tags: string[];
  visitDate: string;
  notes: string | null;
};

type PrescriptionDetailScreenProps = {
  prescriptionId?: string;
  previewPrescription?: PrescriptionPreview;
  onBack?: () => void;
  onEditPrescription?: (prescriptionId: string) => void;
  onDeletedPrescription?: () => void;
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

const DetailItem = ({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) => {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <MaterialIcons name={icon} size={18} color="#137FEC" />
      </View>
      <View>
        <ThemedText style={styles.detailLabel}>{label}</ThemedText>
        <ThemedText style={styles.detailValue}>{value}</ThemedText>
      </View>
    </View>
  );
};

export function PrescriptionDetailScreen({
  prescriptionId,
  previewPrescription,
  onBack,
  onEditPrescription,
  onDeletedPrescription,
}: PrescriptionDetailScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(prescriptionId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!prescriptionId) {
        setPrescription(null);
        setPatientName(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const driver = await openDb();
        await initializeDb(driver);
        const loadedPrescription = await getPrescriptionById(driver, prescriptionId);

        if (!mounted) {
          return;
        }

        if (!loadedPrescription) {
          setErrorMessage('Prescription not found.');
          setPrescription(null);
          setPatientName(null);
          return;
        }

        const loadedPatient = await getPatientById(driver, loadedPrescription.patientId);
        setPrescription(loadedPrescription);
        setPatientName(loadedPatient?.name ?? null);
      } catch {
        if (!mounted) {
          return;
        }

        setPrescription(null);
        setPatientName(null);
        setErrorMessage('Unable to load prescription detail.');
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
  }, [prescriptionId]);

  const resolvedData = useMemo(() => {
    if (prescription) {
      return {
        id: prescription.id,
        photoUri: prescription.photoUri,
        patientName,
        doctorName: prescription.doctorName,
        doctorSpecialty: prescription.doctorSpecialty,
        condition: prescription.condition,
        tags: prescription.tags,
        visitDate: prescription.visitDate,
        notes: prescription.notes,
      };
    }

    if (previewPrescription) {
      return {
        id: undefined,
        patientName: previewPrescription.patientName ?? null,
        ...previewPrescription,
      };
    }

    return null;
  }, [patientName, prescription, previewPrescription]);

  const handleDelete = () => {
    if (!prescriptionId) {
      return;
    }

    Alert.alert('Delete prescription?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const deleted = await deletePrescriptionWithCleanup(boundaries, prescriptionId);
              if (!deleted) {
                setErrorMessage('Prescription not found.');
                return;
              }
              onDeletedPrescription?.();
            } catch {
              setErrorMessage('Unable to delete prescription.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container} testID="prescription-detail-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} testID="prescription-detail-back">
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#D9E6F7" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Prescription Detail</ThemedText>
        <View style={styles.headerActionSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? <ThemedText style={styles.helper}>Loading prescription...</ThemedText> : null}
        {errorMessage ? <ThemedText style={styles.error}>{errorMessage}</ThemedText> : null}

        {resolvedData ? (
          <>
            <Pressable onPress={() => setIsFullscreenVisible(true)} testID="prescription-detail-image" style={styles.imageWrap}>
              <Image source={{ uri: resolvedData.photoUri }} style={styles.image} resizeMode="cover" />
              <View style={styles.zoomPill}>
                <MaterialIcons name="zoom-in" size={12} color="#E7EEF7" />
                <ThemedText style={styles.zoomText}>Tap to enlarge</ThemedText>
              </View>
            </Pressable>
            <View style={styles.recordHead}>
              <View>
                <ThemedText type="subtitle" style={styles.recordTitle}>
                  Clinical Record
                </ThemedText>
                <ThemedText style={styles.recordSub}>Last updated 2 days ago</ThemedText>
              </View>
              <View style={styles.recordActions}>
                <Pressable
                  onPress={() => (prescriptionId ? onEditPrescription?.(prescriptionId) : undefined)}
                  testID="prescription-detail-edit"
                  disabled={!prescriptionId}
                  style={styles.actionCirclePrimary}
                >
                  <MaterialIcons name="edit" size={16} color="#137FEC" />
                </Pressable>
                <Pressable onPress={handleDelete} testID="prescription-detail-delete" disabled={!prescriptionId} style={styles.actionCircleDanger}>
                  <MaterialIcons name="delete" size={16} color="#E25D66" />
                </Pressable>
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailItem icon="groups" label="PATIENT" value={resolvedData.patientName ?? 'Unknown patient'} />
              <DetailItem icon="person" label="DOCTOR" value={resolvedData.doctorName} />
              <DetailItem icon="health-and-safety" label="SPECIALTY" value={resolvedData.doctorSpecialty ?? 'Not provided'} />
              <DetailItem icon="medical-information" label="CONDITION" value={resolvedData.condition} />
              <DetailItem icon="calendar-today" label="VISIT DATE" value={formatVisitDate(resolvedData.visitDate)} />
            </View>

            <View>
              <ThemedText style={styles.tagsLabel}>TAGS</ThemedText>
              <View style={styles.tagRow}>
                {resolvedData.tags.map((tag, index) => (
                  <View key={tag.toLowerCase()} style={[styles.tagChip, index === 0 ? styles.tagPrimary : null]}>
                    <ThemedText style={[styles.tagText, index === 0 ? styles.tagPrimaryText : null]}>{tag}</ThemedText>
                  </View>
                ))}
                <View style={styles.plusTag}>
                  <MaterialIcons name="add" size={14} color="#8EA3BE" />
                </View>
              </View>
            </View>

            {resolvedData.notes ? <ThemedText style={styles.notes}>{resolvedData.notes}</ThemedText> : null}

            <FullscreenImageViewer
              visible={isFullscreenVisible}
              imageUri={resolvedData.photoUri}
              onClose={() => setIsFullscreenVisible(false)}
            />
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actionRowLegacy} testID="prescription-detail-actions">
        <ThemedText style={styles.srOnly}>Actions</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101922',
  },
  header: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1B2A3E',
  },
  headerTitle: {
    color: '#EDF4FC',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  headerActionSpacer: {
    width: 18,
    height: 18,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 10,
  },
  helper: {
    color: '#95A9C3',
  },
  error: {
    color: '#F1A0A8',
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#D7DADF',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 420,
  },
  zoomPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(42, 49, 62, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomText: {
    color: '#E7EEF7',
    fontSize: 11,
    lineHeight: 13,
  },
  recordHead: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitle: {
    color: '#E8EEF7',
    fontSize: 35 / 1.5,
    lineHeight: 40 / 1.5,
  },
  recordSub: {
    color: '#7F94B2',
    fontSize: 13,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCirclePrimary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(19,127,236,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCircleDanger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(226,93,102,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailList: {
    marginTop: 6,
    gap: 8,
  },
  detailRow: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#141F30',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(19,127,236,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6E84A3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: '#E4EDF9',
    fontSize: 29 / 1.5,
    lineHeight: 34 / 1.5,
    fontWeight: '700',
    marginTop: 1,
  },
  tagsLabel: {
    color: '#8296B3',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: '#283349',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagPrimary: {
    backgroundColor: 'rgba(19,127,236,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(19,127,236,0.4)',
  },
  tagText: {
    color: '#BFD0E4',
    fontSize: 11,
    fontWeight: '700',
  },
  tagPrimaryText: {
    color: '#4AB0FF',
  },
  plusTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4B5E79',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notes: {
    color: '#90A5C2',
    marginTop: 8,
  },
  actionRowLegacy: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 1,
    opacity: 0,
  },
  srOnly: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
