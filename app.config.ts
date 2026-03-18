import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;
const defaultEasProjectId = "1daa4adf-a3ae-4720-8a61-f460765b93af";

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  process.env.EAS_PROJECT_ID?.trim() ||
  defaultEasProjectId;

const updateUrl = easProjectId ? `https://u.expo.dev/${easProjectId}` : undefined;

const config: ExpoConfig = {
  ...baseConfig,
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    ...(baseConfig.updates ?? {}),
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    ...(updateUrl ? { url: updateUrl } : {}),
  },
  extra: {
    ...(baseConfig.extra ?? {}),
    eas: {
      projectId: easProjectId,
    },
  },
};

export default config;
