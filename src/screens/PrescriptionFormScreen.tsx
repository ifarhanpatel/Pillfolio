import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type PrescriptionFormMode = 'add' | 'edit';

type PrescriptionFormScreenProps = {
  mode: PrescriptionFormMode;
};

export function PrescriptionFormScreen({ mode }: PrescriptionFormScreenProps) {
  const title = mode === 'edit' ? 'Edit Prescription' : 'Add Prescription';

  return (
    <ThemedView style={styles.container} testID="prescription-form-screen">
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText type="default">Capture visit details and attach a photo.</ThemedText>
      <ThemedView style={styles.section} testID="prescription-form-photo">
        <ThemedText type="subtitle">Photo</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section} testID="prescription-form-fields">
        <ThemedText type="subtitle">Details</ThemedText>
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
  section: {
    marginTop: 8,
  },
});
