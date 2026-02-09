import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function TimelineScreen() {
  return (
    <ThemedView style={styles.container} testID="timeline-screen">
      <ThemedText type="title">Timeline</ThemedText>
      <ThemedText type="default">Select a patient to view prescriptions.</ThemedText>
      <ThemedView style={styles.searchPlaceholder} testID="timeline-search-placeholder">
        <ThemedText type="subtitle">Search</ThemedText>
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
  searchPlaceholder: {
    marginTop: 8,
  },
});
