import Constants from "expo-constants";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { LogBox, Platform } from "react-native";
import "react-native-reanimated";

import { AppLaunchScreen } from "@/src/components/AppLaunchScreen";
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
import { ThemePreferenceProvider, useThemePreference } from "@/src/theme/theme-preference";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the native splash is already under app control.
});

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
  const { colorScheme } = useThemePreference();

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
      </ThemeProvider>
    </LocaleProvider>
  );
}

function RootLayoutContent() {
  const { colorScheme, hasHydratedPreference } = useThemePreference();
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);

  useEffect(() => {
    if (!hasHydratedPreference) {
      return;
    }

    const nativeSplashPromise = SplashScreen.hideAsync().catch(() => {
      // Ignore if the native splash has already been dismissed.
    });
    const timer = setTimeout(() => {
      setShowLaunchScreen(false);
    }, 900);

    void nativeSplashPromise;

    return () => {
      clearTimeout(timer);
    };
  }, [hasHydratedPreference]);

  if (!hasHydratedPreference || showLaunchScreen) {
    return (
      <>
        <AppLaunchScreen colorScheme={colorScheme} />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </>
  );
}

function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  );
}

export default Sentry.wrap(RootLayout);
