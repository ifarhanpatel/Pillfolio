import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function PrescriptionDetailScreen() {
  return (
    <ThemedView style={styles.container} testID="prescription-detail-screen">
      <ThemedText type="title">Prescription Detail</ThemedText>
      <ThemedText type="default">Photo and visit metadata go here.</ThemedText>
      <ThemedView style={styles.actions} testID="prescription-detail-actions">
        <ThemedText type="subtitle">Edit</ThemedText>
        <ThemedText type="subtitle">Delete</ThemedText>
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
  actions: {
    marginTop: 8,
    gap: 8,
  },
});
