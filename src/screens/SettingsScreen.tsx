import Constants from 'expo-constants';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version ?? 'Unknown';

  return (
    <ThemedView style={styles.container} testID="settings-screen">
      <ThemedText type="title">Settings</ThemedText>
      <ThemedView style={styles.section} testID="settings-privacy">
        <ThemedText type="subtitle">Privacy</ThemedText>
        <ThemedText type="default">
          Your data is stored only on this device. No cloud sync is enabled.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.section} testID="settings-backup">
        <ThemedText type="subtitle">Backup</ThemedText>
        <Pressable
          accessibilityRole="button"
          disabled
          style={styles.disabledButton}
          testID="settings-export-button"
        >
          <ThemedText type="defaultSemiBold">Export/Backup (Coming Soon)</ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView style={styles.section} testID="settings-about">
        <ThemedText type="subtitle">About</ThemedText>
        <ThemedText type="default" testID="settings-version">
          App Version: {appVersion}
        </ThemedText>
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
    gap: 8,
  },
  disabledButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.6,
  },
});
