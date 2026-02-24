export type AppLocaleCode = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr';

export type PlannedLocaleCode = AppLocaleCode | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as';

export type LocaleOption = {
  code: AppLocaleCode;
  label: string;
  nativeLabel: string;
};

export const APP_LOCALE_STORAGE_KEY = 'app.locale';

export const APP_LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

