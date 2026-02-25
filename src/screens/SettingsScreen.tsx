import Constants from 'expo-constants';
import { useContext } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppLocale, useTranslation } from '@/src/i18n/LocaleProvider';
import { APP_LOCALE_OPTIONS } from '@/src/i18n/types';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const appVersion = Constants.expoConfig?.version ?? t('settings.versionUnknown');

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]} testID="settings-screen">
      <ThemedText type="title" style={styles.pageTitle}>
        {t('settings.title')}
      </ThemedText>
      <ThemedView style={styles.section} testID="settings-language">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.languageTitle')}
        </ThemedText>
        <ThemedText type="default" style={styles.bodyText} testID="settings-language-current">
          {t('settings.languageCurrent', {
            language:
              APP_LOCALE_OPTIONS.find((option) => option.code === locale)?.label ?? locale,
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
                testID={`settings-language-option-${option.code}`}
              >
                <ThemedText style={[styles.languageButtonText, selected && styles.languageButtonTextSelected]}>
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
          disabled
          style={styles.disabledButton}
          testID="settings-export-button"
        >
          <ThemedText type="defaultSemiBold" style={styles.disabledButtonText}>
            {t('settings.backupCta')}
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
