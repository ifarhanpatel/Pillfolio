import Constants from 'expo-constants';
import { useContext } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function SettingsScreen() {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const appVersion = Constants.expoConfig?.version ?? 'Unknown';

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="settings-screen">
      <ThemedText type="title" style={styles.pageTitle}>
        Settings
      </ThemedText>
      <ThemedView style={styles.section} testID="settings-privacy">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Privacy
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText}>
          Your data is stored only on this device. No cloud sync is enabled.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.section} testID="settings-backup">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Backup
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          disabled
          style={styles.disabledButton}
          testID="settings-export-button"
        >
          <ThemedText type="defaultSemiBold" style={styles.disabledButtonText}>
            Export/Backup (Coming Soon)
          </ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView style={styles.section} testID="settings-about">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          About
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText} testID="settings-version">
          App Version: {appVersion}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#07101D',
  },
  pageTitle: {
    color: '#EAF3FF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  section: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A4766',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#0F2237',
  },
  sectionTitle: {
    color: '#DBECFE',
  },
  bodyText: {
    color: '#A9C1DB',
  },
  disabledButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F4E6F',
    backgroundColor: '#0C1C2E',
    opacity: 0.75,
  },
  disabledButtonText: {
    color: '#B6CCE4',
  },
});
