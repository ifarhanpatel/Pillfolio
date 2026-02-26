import * as FileSystem from 'expo-file-system/legacy';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  systemColorScheme: ResolvedThemeMode;
  colorScheme: ResolvedThemeMode;
};

const noop = () => {};
const THEME_SETTINGS_DIR = 'pillfolio-settings';
const THEME_SETTINGS_FILE = 'theme-preference.json';

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: 'system',
  setPreference: noop,
  systemColorScheme: 'light',
  colorScheme: 'light',
});

const resolveSystemScheme = (value: 'light' | 'dark' | null | undefined): ResolvedThemeMode => {
  return value === 'dark' ? 'dark' : 'light';
};

const isThemePreference = (value: unknown): value is ThemePreference => {
  return value === 'system' || value === 'light' || value === 'dark';
};

const resolveBaseDirectory = (fileSystem: Record<string, unknown>): string | null => {
  const directDocument = fileSystem.documentDirectory;
  if (typeof directDocument === 'string' && directDocument.length > 0) {
    return directDocument;
  }

  const directCache = fileSystem.cacheDirectory;
  if (typeof directCache === 'string' && directCache.length > 0) {
    return directCache;
  }

  const paths = fileSystem.Paths as
    | {
        document?: { uri?: string };
        cache?: { uri?: string };
      }
    | undefined;

  const pathsDocument = paths?.document?.uri;
  if (typeof pathsDocument === 'string' && pathsDocument.length > 0) {
    return pathsDocument;
  }

  const pathsCache = paths?.cache?.uri;
  if (typeof pathsCache === 'string' && pathsCache.length > 0) {
    return pathsCache;
  }

  return null;
};

const joinUri = (baseUri: string, segment: string): string => {
  const normalizedBase = baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
  const normalizedSegment = segment.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${normalizedBase}/${normalizedSegment}`;
};

const getThemePreferenceFileUri = (): string | null => {
  const baseDirectory = resolveBaseDirectory(FileSystem as unknown as Record<string, unknown>);
  if (!baseDirectory) {
    return null;
  }

  return joinUri(joinUri(baseDirectory, THEME_SETTINGS_DIR), THEME_SETTINGS_FILE);
};

const loadStoredThemePreference = async (): Promise<ThemePreference | null> => {
  const fileUri = getThemePreferenceFileUri();
  if (!fileUri) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(raw) as { preference?: unknown };
    return isThemePreference(parsed.preference) ? parsed.preference : null;
  } catch {
    return null;
  }
};

const saveStoredThemePreference = async (preference: ThemePreference): Promise<void> => {
  const fileUri = getThemePreferenceFileUri();
  if (!fileUri) {
    return;
  }

  const directoryUri = fileUri.slice(0, fileUri.lastIndexOf('/'));
  if (!directoryUri) {
    return;
  }

  try {
    await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ preference }));
  } catch {
    // Best effort persistence.
  }
};

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>('dark');
  const [hasHydratedPreference, setHasHydratedPreference] = useState(false);
  const systemColorScheme = resolveSystemScheme(useSystemColorScheme());

  useEffect(() => {
    let active = true;

    void (async () => {
      const storedPreference = await loadStoredThemePreference();
      if (!active) {
        return;
      }

      if (storedPreference) {
        setPreference(storedPreference);
      }
      setHasHydratedPreference(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedPreference) {
      return;
    }

    void saveStoredThemePreference(preference);
  }, [hasHydratedPreference, preference]);

  const value = useMemo<ThemePreferenceContextValue>(() => {
    const colorScheme = preference === 'system' ? systemColorScheme : preference;
    return {
      preference,
      setPreference,
      systemColorScheme,
      colorScheme,
    };
  }, [preference, systemColorScheme]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

export function useAppColorScheme(): ResolvedThemeMode {
  return useThemePreference().colorScheme;
}
