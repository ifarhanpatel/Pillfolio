import Constants from 'expo-constants';
import { useContext, useMemo, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppLocale, useTranslation } from '@/src/i18n/LocaleProvider';
import { APP_LOCALE_OPTIONS } from '@/src/i18n/types';
import {
  createAppBoundaries,
  exportBackup,
  importBackup,
  saveBackupToDeviceFiles,
  type BackupImportMode,
} from '@/src/services';
import { createAutoThemedStyles, useAutoThemedStyles } from '@/src/theme/auto-theme';
import { type ThemePreference, useThemePreference } from '@/src/theme/theme-preference';

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type SettingsScreenProps = {
  onExport?: () => Promise<void>;
  onSaveToDeviceFiles?: () => Promise<void>;
  onRestore?: () => Promise<void>;
};

export function SettingsScreen({
  onExport,
  onSaveToDeviceFiles,
  onRestore,
}: SettingsScreenProps = {}) {
  const styles = useAutoThemedStyles(screenStyles);
  const { preference, setPreference, systemColorScheme } = useThemePreference();
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const appVersion = Constants.expoConfig?.version ?? t('settings.versionUnknown');
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const [busy, setBusy] = useState(false);

  const runExport = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (onExport) {
        await onExport();
      } else {
        await exportBackup(boundaries);
      }

      Alert.alert('Backup Exported', 'Your backup file is ready to share.');
    } catch (error) {
      Alert.alert('Backup Error', error instanceof Error ? error.message : 'Unable to export backup.');
    } finally {
      setBusy(false);
    }
  };

  const runSaveToDeviceFiles = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (onSaveToDeviceFiles) {
        await onSaveToDeviceFiles();
        Alert.alert('Backup Saved', 'Your backup file has been saved to device files.');
      } else {
        const result = await saveBackupToDeviceFiles(boundaries);
        if (!result.deviceFileUri) {
          Alert.alert('Save Cancelled', 'No folder was selected.');
        } else {
          Alert.alert('Backup Saved', 'Your backup file has been saved to device files.');
        }
      }
    } catch (error) {
      Alert.alert(
        'Backup Error',
        error instanceof Error ? error.message : 'Unable to save backup to device files.'
      );
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async (mode: BackupImportMode) => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (onRestore) {
        await onRestore();
      } else {
        const result = await importBackup(boundaries, mode);
        if (result.importedPatients === 0 && result.importedPrescriptions === 0) {
          Alert.alert('Restore Cancelled', 'No backup file was selected.');
        } else {
          Alert.alert(
            'Restore Complete',
            `Imported ${result.importedPatients} patients and ${result.importedPrescriptions} prescriptions.`
          );
        }
      }
    } catch (error) {
      Alert.alert('Restore Error', error instanceof Error ? error.message : 'Unable to restore backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="settings-screen">
      <ThemedText type="title" style={styles.pageTitle}>
        {t('settings.title')}
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
                testID={`settings-theme-${option.value}-button`}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section} testID="settings-language">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.languageTitle')}
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText} testID="settings-language-current">
          {t('settings.languageCurrent', {
            language: APP_LOCALE_OPTIONS.find((option) => option.code === locale)?.label ?? locale,
          })}
        </ThemedText>
        <ThemedView style={styles.languageList}>
          {APP_LOCALE_OPTIONS.map((option) => {
            const selected = option.code === locale;
            return (
              <Pressable
                key={option.code}
                onPress={() => void setLocale(option.code)}
                style={[styles.languageButton, selected && styles.languageButtonSelected]}
                testID={`settings-language-option-${option.code}`}>
                <ThemedText
                  style={[styles.languageButtonText, selected && styles.languageButtonTextSelected]}>
                  {t('settings.languageOptionLabel', {
                    nativeLabel: option.nativeLabel,
                    label: option.label,
                  })}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section} testID="settings-privacy">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.privacyTitle')}
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText}>
          {t('settings.privacyBody')}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section} testID="settings-backup">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.backupTitle')}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runExport();
          }}
          style={({ pressed }) => [styles.button, pressed && !busy ? styles.buttonPressed : undefined]}
          testID="settings-export-button">
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Export Backup
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runSaveToDeviceFiles();
          }}
          style={({ pressed }) => [styles.buttonSecondary, pressed && !busy ? styles.buttonPressed : undefined]}
          testID="settings-save-device-files-button">
          <ThemedText type="default" style={styles.buttonText}>
            Save Backup to Device Files
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runRestore('replace');
          }}
          style={({ pressed }) => [styles.button, pressed && !busy ? styles.buttonPressed : undefined]}
          testID="settings-restore-button">
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Restore Backup
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runRestore('merge');
          }}
          style={({ pressed }) => [styles.buttonSecondary, pressed && !busy ? styles.buttonPressed : undefined]}
          testID="settings-restore-merge-button">
          <ThemedText type="default" style={styles.buttonText}>
            Restore Backup (Merge)
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.section} testID="settings-about">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.aboutTitle')}
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText} testID="settings-version">
          {t('settings.versionLabel', { version: appVersion })}
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
  languageList: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  languageButton: {
    borderWidth: 1,
    borderColor: '#2F4E6F',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0C1C2E',
  },
  languageButtonSelected: {
    borderColor: '#137FEC',
    backgroundColor: 'rgba(19,127,236,0.16)',
  },
  languageButtonText: {
    color: '#B6CCE4',
  },
  languageButtonTextSelected: {
    color: '#DCEEFF',
    fontWeight: '700',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A77B0',
    backgroundColor: '#1C5B95',
  },
  buttonSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F4E6F',
    backgroundColor: '#0C1C2E',
  },
  buttonText: {
    color: '#EAF3FF',
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
