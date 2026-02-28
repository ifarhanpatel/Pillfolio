import * as Sentry from '@sentry/react-native';

let isSentryInitialized = false;

export const initializeSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (isSentryInitialized || process.env.NODE_ENV === 'test' || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1 : 0.2,
  });

  isSentryInitialized = true;
};

export { Sentry };
