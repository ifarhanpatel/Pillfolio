import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { translate } from './index';
import { APP_LOCALE_STORAGE_KEY, type AppLocaleCode } from './types';

type LocaleContextValue = {
  locale: AppLocaleCode;
  setLocale: (code: AppLocaleCode) => Promise<void>;
  isReady: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type TranslationContextValue = {
  t: (key: string, options?: Record<string, string | number | boolean | undefined>) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);
const fallbackLocaleContext: LocaleContextValue = {
  locale: 'en',
  setLocale: async () => undefined,
  isReady: true,
};
const fallbackTranslationContext: TranslationContextValue = {
  t: (key, options) => translate('en', key, options),
};

let memoryLocale: AppLocaleCode | null = null;
type BasicStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const getWebStorage = (): BasicStorage | null => {
  const candidate = (globalThis as { localStorage?: BasicStorage }).localStorage;
  return candidate ?? null;
};

const readNativeLocale = async (): Promise<AppLocaleCode | null> => {
  try {
    const fs = await import('expo-file-system');
    const documentDirectory = (fs as unknown as { documentDirectory?: string | null }).documentDirectory;
    if (!documentDirectory) {
      return null;
    }

    const fileUri = `${documentDirectory}${APP_LOCALE_STORAGE_KEY}.txt`;
    const info = await (fs as unknown as {
      getInfoAsync?: (uri: string) => Promise<{ exists: boolean }>;
    }).getInfoAsync?.(fileUri);
    if (!info?.exists) {
      return null;
    }

    const raw = await (fs as unknown as {
      readAsStringAsync?: (uri: string) => Promise<string>;
    }).readAsStringAsync?.(fileUri);
    return (raw?.trim() || null) as AppLocaleCode | null;
  } catch {
    return null;
  }
};

const writeNativeLocale = async (locale: AppLocaleCode): Promise<boolean> => {
  try {
    const fs = await import('expo-file-system');
    const documentDirectory = (fs as unknown as { documentDirectory?: string | null }).documentDirectory;
    if (!documentDirectory) {
      return false;
    }

    const fileUri = `${documentDirectory}${APP_LOCALE_STORAGE_KEY}.txt`;
    await (fs as unknown as {
      writeAsStringAsync?: (uri: string, contents: string) => Promise<void>;
    }).writeAsStringAsync?.(fileUri, locale);
    return true;
  } catch {
    return false;
  }
};

const loadLocale = async (): Promise<AppLocaleCode | null> => {
  const storage = getWebStorage();
  if (storage) {
    const value = storage.getItem(APP_LOCALE_STORAGE_KEY);
    return value as AppLocaleCode | null;
  }

  const nativeLocale = await readNativeLocale();
  if (nativeLocale) {
    return nativeLocale;
  }

  return memoryLocale;
};

const saveLocale = async (locale: AppLocaleCode): Promise<void> => {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(APP_LOCALE_STORAGE_KEY, locale);
    return;
  }

  const persisted = await writeNativeLocale(locale);
  if (persisted) {
    return;
  }

  memoryLocale = locale;
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocaleCode>('en');
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const stored = await loadLocale();
        if (mounted && stored) {
          setLocaleState(stored);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = async (code: AppLocaleCode) => {
    setLocaleState(code);
    await saveLocale(code);
  };

  const localeValue = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, isReady }),
    [isReady, locale]
  );
  const translationValue = useMemo<TranslationContextValue>(
    () => ({
      t: (key, options) => translate(locale, key, options),
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={localeValue}>
      <TranslationContext.Provider value={translationValue}>{children}</TranslationContext.Provider>
    </LocaleContext.Provider>
  );
}

export const useAppLocale = (): LocaleContextValue => {
  const value = useContext(LocaleContext);
  return value ?? fallbackLocaleContext;
};

export const useTranslation = (): TranslationContextValue => {
  const value = useContext(TranslationContext);
  return value ?? fallbackTranslationContext;
};
