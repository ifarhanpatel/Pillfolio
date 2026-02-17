import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FullscreenImageViewer } from '@/src/components/FullscreenImageViewer';
import { getPrescriptionById } from '@/src/db/prescriptions';
import type { Prescription } from '@/src/db/types';
import { initializeDb, openDb } from '@/src/db';
import { createAppBoundaries, deletePrescriptionWithCleanup } from '@/src/services';

type PrescriptionPreview = {
  photoUri: string;
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

export function PrescriptionDetailScreen({
  prescriptionId,
  previewPrescription,
  onEditPrescription,
  onDeletedPrescription,
}: PrescriptionDetailScreenProps) {
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(prescriptionId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!prescriptionId) {
        setPrescription(null);
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
          return;
        }

        setPrescription(loadedPrescription);
      } catch {
        if (!mounted) {
          return;
        }

        setPrescription(null);
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
        ...previewPrescription,
      };
    }

    return null;
  }, [prescription, previewPrescription]);

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
      <ThemedText type="title">Prescription Detail</ThemedText>
      {isLoading ? <ThemedText type="default">Loading prescription...</ThemedText> : null}
      {errorMessage ? <ThemedText type="default">{errorMessage}</ThemedText> : null}
      {resolvedData ? (
        <>
          <Pressable onPress={() => setIsFullscreenVisible(true)} testID="prescription-detail-image">
            <Image source={{ uri: resolvedData.photoUri }} style={styles.image} resizeMode="cover" />
          </Pressable>
          <ThemedText type="default" testID="prescription-detail-photo-uri">
            {resolvedData.photoUri}
          </ThemedText>
          <ThemedView style={styles.metadata}>
            <ThemedText type="defaultSemiBold">{formatVisitDate(resolvedData.visitDate)}</ThemedText>
            <ThemedText type="default">{resolvedData.doctorName}</ThemedText>
            <ThemedText type="default">{resolvedData.condition}</ThemedText>
            {resolvedData.doctorSpecialty ? (
              <ThemedText type="default">{resolvedData.doctorSpecialty}</ThemedText>
            ) : null}
            {resolvedData.tags.length > 0 ? (
              <ThemedText type="default">{resolvedData.tags.join(', ')}</ThemedText>
            ) : null}
            {resolvedData.notes ? <ThemedText type="default">{resolvedData.notes}</ThemedText> : null}
          </ThemedView>
          <FullscreenImageViewer
            visible={isFullscreenVisible}
            imageUri={resolvedData.photoUri}
            onClose={() => setIsFullscreenVisible(false)}
          />
        </>
      ) : null}
      <ThemedView style={styles.actions} testID="prescription-detail-actions">
        <Pressable
          onPress={() => (prescriptionId ? onEditPrescription?.(prescriptionId) : undefined)}
          testID="prescription-detail-edit"
          disabled={!prescriptionId}>
          <ThemedText type="subtitle">Edit</ThemedText>
        </Pressable>
        <Pressable onPress={handleDelete} testID="prescription-detail-delete" disabled={!prescriptionId}>
          <ThemedText type="subtitle">Delete</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#E8ECEF',
  },
  metadata: {
    marginTop: 4,
    gap: 4,
  },
  actions: {
    marginTop: 8,
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
