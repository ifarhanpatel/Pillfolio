import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function PatientsScreen() {
  return (
    <ThemedView style={styles.container} testID="patients-screen">
      <ThemedText type="title">Patients</ThemedText>
      <ThemedText type="default">Manage people and their prescriptions.</ThemedText>
      <ThemedView style={styles.cta} testID="patients-cta">
        <ThemedText type="subtitle">Add Patient</ThemedText>
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
  cta: {
    marginTop: 12,
  },
});
