import Constants from 'expo-constants';
import { useContext, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  createAppBoundaries,
  exportBackup,
  importBackup,
  saveBackupToDeviceFiles,
  type BackupImportMode,
} from '@/src/services';

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
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  const appVersion = Constants.expoConfig?.version ?? 'Unknown';
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
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#EAF3FF',
  },
});
