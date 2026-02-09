import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function SettingsScreen() {
  return (
    <ThemedView style={styles.container} testID="settings-screen">
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText type="subtitle">Privacy</ThemedText>
      <ThemedText type="default">
        Your data is stored only on this device. No cloud sync is enabled.
      </ThemedText>
      <ThemedView style={styles.section} testID="settings-about">
        <ThemedText type="subtitle">About</ThemedText>
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
    marginTop: 12,
  },
});
