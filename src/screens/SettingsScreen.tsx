import Constants from 'expo-constants';
import { useContext } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createAutoThemedStyles, useAutoThemedStyles } from '@/src/theme/auto-theme';
import { type ThemePreference, useThemePreference } from '@/src/theme/theme-preference';

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const styles = useAutoThemedStyles(screenStyles);
  const { preference, setPreference, systemColorScheme } = useThemePreference();
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
      <ThemedView style={styles.section} testID="settings-appearance">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Appearance
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText} testID="settings-theme-selected">
          Theme: {preference === 'system' ? `System (${systemColorScheme})` : preference}
        </ThemedText>
        <ThemedView style={styles.toggleRow}>
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === preference;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => setPreference(option.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  selected && styles.themeOptionSelected,
                  pressed && styles.buttonPressed,
                ]}
                testID={`settings-theme-${option.value}-button`}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>
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

const screenStyles = createAutoThemedStyles({
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  themeOption: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F4E6F',
    backgroundColor: '#0C1C2E',
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeOptionSelected: {
    borderColor: '#137FEC',
    backgroundColor: 'rgba(19,127,236,0.18)',
  },
  themeOptionText: {
    color: '#B6CCE4',
    textTransform: 'uppercase',
    fontSize: 13,
    lineHeight: 16,
  },
  themeOptionTextSelected: {
    color: '#4AB0FF',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
