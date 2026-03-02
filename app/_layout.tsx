import Constants from "expo-constants";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { LogBox, Platform } from "react-native";
import "react-native-reanimated";

import { LocaleProvider, useAppLocale } from "@/src/i18n/LocaleProvider";
import {
  addSentryBreadcrumb,
  configureSentryIdentity,
  initializeSentry,
  normalizeSentryRoute,
  Sentry,
  setSentryAppContext,
  setSentryTag,
} from "@/src/services/sentry";
import { ThemePreferenceProvider, useAppColorScheme, useThemePreference } from "@/src/theme/theme-preference";

// Prevent "Open debugger to view warnings" overlay from covering the tab bar during E2E tests.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

export const unstable_settings = {
  anchor: "(tabs)",
};

initializeSentry();

function SentryInstrumentation() {
  const pathname = usePathname();
  const segments = useSegments();
  const { locale } = useAppLocale();
  const { preference } = useThemePreference();
  const lastRouteRef = useRef<string | null>(null);
  const appVersion = Constants.expoConfig?.version ?? "unknown";
  const normalizedRoute = normalizeSentryRoute(pathname, segments);

  useEffect(() => {
    void configureSentryIdentity().catch(() => {
      if (__DEV__) {
        console.warn("[Sentry] Failed to configure anonymous identity.");
      }
    });
  }, []);

  useEffect(() => {
    const appSection = normalizedRoute.startsWith("(tabs)/") ? "tabs" : "stack";

    setSentryAppContext({
      locale,
      themePreference: preference,
    });
    setSentryTag("route", normalizedRoute);
    setSentryTag("app_section", appSection);
    setSentryTag("app_version", appVersion);
    setSentryTag("platform_os", Platform.OS);

    if (lastRouteRef.current === normalizedRoute) {
      return;
    }

    addSentryBreadcrumb({
      category: "navigation",
      message: "route_change",
      data: {
        route: normalizedRoute,
      },
    });
    lastRouteRef.current = normalizedRoute;
  }, [appVersion, locale, normalizedRoute, preference]);

  return null;
}

function RootNavigator() {
  const colorScheme = useAppColorScheme();

  return (
    <LocaleProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SentryInstrumentation />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-edit-patient" options={{ headerShown: false }} />
          <Stack.Screen name="add-edit-prescription" options={{ headerShown: false }} />
          <Stack.Screen name="prescription-detail" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </LocaleProvider>
  );
}

function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootNavigator />
    </ThemePreferenceProvider>
  );
}

export default Sentry.wrap(RootLayout);
