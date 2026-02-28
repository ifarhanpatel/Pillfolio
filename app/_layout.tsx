import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import "react-native-reanimated";

import { LocaleProvider } from "@/src/i18n/LocaleProvider";
import { Sentry, initializeSentry } from "@/src/services/sentry";
import { ThemePreferenceProvider, useAppColorScheme } from "@/src/theme/theme-preference";

// Prevent "Open debugger to view warnings" overlay from covering the tab bar during E2E tests.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

export const unstable_settings = {
  anchor: "(tabs)",
};

initializeSentry();

function RootNavigator() {
  const colorScheme = useAppColorScheme();

  return (
    <LocaleProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
