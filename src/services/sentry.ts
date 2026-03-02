import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

import { createId } from '../utils/id';

const SENTRY_INSTALL_ID_KEY = 'pillfolio.sentry.install-id';
const BLOCKED_KEYS = new Set([
  'name',
  'doctorname',
  'doctorspecialty',
  'notes',
  'photouri',
  'fileuri',
  'base64contents',
  'relationship',
  'gender',
  'age',
  'patientid',
  'prescriptionid',
  'tags',
]);
const ALLOWED_BUILT_IN_CONTEXTS = new Set([
  'app',
  'browser',
  'culture',
  'device',
  'os',
  'react_native_context',
  'response',
  'runtime',
  'trace',
]);

export type SentryAppContext = {
  locale?: string;
  themePreference?: 'system' | 'light' | 'dark';
  hasPrimaryPatient?: boolean;
  patientCount?: number;
  prescriptionCount?: number;
};

export type SafeBreadcrumbInput = {
  category: 'navigation' | 'prescription' | 'backup' | 'database' | 'settings';
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, string | number | boolean | null>;
};

export type SafeErrorContext = {
  area: 'prescription' | 'backup' | 'database' | 'settings' | 'navigation';
  action: string;
  data?: Record<string, string | number | boolean | null>;
};

export type SentrySpanOp =
  | 'navigation'
  | 'ui.action'
  | 'db'
  | 'file'
  | 'backup'
  | 'prescription';

export type SafeSpanAttributes = Record<string, string | number | boolean>;

let isSentryInitialized = false;
let hasConfiguredIdentity = false;

const isSentryEnabled = (): boolean => {
  return process.env.NODE_ENV !== 'test' && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);
};

const isPrimitive = (value: unknown): value is string | number | boolean | null => {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBlockedKey = (key: string): boolean => BLOCKED_KEYS.has(key.toLowerCase());

const sanitizePrimitiveMap = (
  input?: Record<string, unknown> | null
): Record<string, string | number | boolean | null> | undefined => {
  if (!input) {
    return undefined;
  }

  const safeEntries = Object.entries(input).filter(([key, value]) => {
    return !isBlockedKey(key) && isPrimitive(value);
  });

  if (safeEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(safeEntries) as Record<string, string | number | boolean | null>;
};

const sanitizeAppContext = (context: SentryAppContext): Record<string, string | number | boolean> | undefined => {
  const raw: Record<string, unknown> = {
    locale: context.locale,
    themePreference: context.themePreference,
    hasPrimaryPatient: context.hasPrimaryPatient,
    patientCount: context.patientCount,
    prescriptionCount: context.prescriptionCount,
  };

  const safe = sanitizePrimitiveMap(raw);
  if (!safe) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(safe).filter(([, value]) => value !== null)
  ) as Record<string, string | number | boolean>;
};

const sanitizeErrorContext = (
  context?: SafeErrorContext
): Record<string, string | number | boolean> | undefined => {
  if (!context) {
    return undefined;
  }

  const safe = sanitizePrimitiveMap({
    area: context.area,
    action: context.action,
    ...(context.data ?? {}),
  });

  if (!safe) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(safe).filter(([, value]) => value !== null)
  ) as Record<string, string | number | boolean>;
};

const sanitizeSpanAttributes = (
  attributes?: SafeSpanAttributes
): Record<string, string | number | boolean> | undefined => {
  if (!attributes) {
    return undefined;
  }

  const safe = sanitizePrimitiveMap(attributes as Record<string, unknown>);
  if (!safe) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(safe).filter(([, value]) => value !== null)
  ) as Record<string, string | number | boolean>;
};

const sanitizeEvent = (event: Record<string, unknown>): Record<string, unknown> => {
  const nextEvent = { ...event };

  if (isPlainObject(nextEvent.user)) {
    const nextUser = { ...nextEvent.user };
    delete nextUser.ip_address;
    nextEvent.user = nextUser;
  }

  if (isPlainObject(nextEvent.extra)) {
    const safeExtra = sanitizePrimitiveMap(nextEvent.extra);
    nextEvent.extra = safeExtra ?? undefined;
  }

  if (isPlainObject(nextEvent.contexts)) {
    const nextContexts = { ...nextEvent.contexts };

    for (const [contextName, contextValue] of Object.entries(nextContexts)) {
      if (!isPlainObject(contextValue)) {
        continue;
      }

      if (ALLOWED_BUILT_IN_CONTEXTS.has(contextName)) {
        continue;
      }

      const safeContext = sanitizePrimitiveMap(contextValue);
      if (!safeContext) {
        delete nextContexts[contextName];
        continue;
      }

      nextContexts[contextName] = safeContext;
    }

    nextEvent.contexts = nextContexts;
  }

  return nextEvent;
};

const normalizeCapturedError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error');
};

export const initializeSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (isSentryInitialized || process.env.NODE_ENV === 'test' || !dsn) {
    return;
  }

  const tracingIntegration =
    typeof Sentry.reactNativeTracingIntegration === 'function'
      ? Sentry.reactNativeTracingIntegration()
      : undefined;

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1 : 0.2,
    attachScreenshot: false,
    attachViewHierarchy: false,
    integrations: tracingIntegration ? [tracingIntegration] : [],
    beforeSend: (event) => sanitizeEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  });

  isSentryInitialized = true;
};

export const configureSentryIdentity = async (): Promise<void> => {
  if (!isSentryEnabled() || hasConfiguredIdentity) {
    return;
  }

  let installId = await AsyncStorage.getItem(SENTRY_INSTALL_ID_KEY);
  if (!installId) {
    installId = `install_${createId()}`;
    await AsyncStorage.setItem(SENTRY_INSTALL_ID_KEY, installId);
  }

  Sentry.setUser({ id: installId });
  Sentry.setTag('identity_kind', 'anonymous_install');
  hasConfiguredIdentity = true;
};

export const setSentryAppContext = (context: SentryAppContext): void => {
  if (!isSentryEnabled()) {
    return;
  }

  const safeContext = sanitizeAppContext(context);
  if (!safeContext) {
    return;
  }

  Sentry.setContext('app_state', safeContext);

  if (typeof safeContext.locale === 'string') {
    Sentry.setTag('locale', safeContext.locale);
  }

  if (typeof safeContext.themePreference === 'string') {
    Sentry.setTag('theme_preference', safeContext.themePreference);
  }
};

export const setSentryTag = (key: string, value: string | number | boolean): void => {
  if (!isSentryEnabled() || isBlockedKey(key)) {
    return;
  }

  Sentry.setTag(key, String(value));
};

export const addSentryBreadcrumb = (crumb: SafeBreadcrumbInput): void => {
  if (!isSentryEnabled()) {
    return;
  }

  const safeData = sanitizePrimitiveMap(crumb.data);

  Sentry.addBreadcrumb({
    category: crumb.category,
    message: crumb.message,
    level: crumb.level ?? 'info',
    ...(safeData ? { data: safeData } : {}),
  });
};

export const captureSentryException = (
  error: unknown,
  context?: SafeErrorContext
): string | undefined => {
  if (!isSentryEnabled()) {
    return undefined;
  }

  const safeContext = sanitizeErrorContext(context);
  return Sentry.captureException(normalizeCapturedError(error), safeContext
    ? ({
        contexts: {
          error_context: safeContext,
        },
      } as never)
    : undefined);
};

export const captureSentryMessage = (
  message: string,
  context?: SafeErrorContext
): string | undefined => {
  if (!isSentryEnabled()) {
    return undefined;
  }

  const safeContext = sanitizeErrorContext(context);
  return Sentry.captureMessage(message, safeContext
    ? ({
        contexts: {
          error_context: safeContext,
        },
      } as never)
    : undefined);
};

export const withSentrySpan = async <T>(
  name: string,
  op: SentrySpanOp,
  fn: () => Promise<T>,
  attributes?: SafeSpanAttributes
): Promise<T> => {
  if (!isSentryEnabled() || typeof Sentry.startSpan !== 'function') {
    return fn();
  }

  const safeAttributes = sanitizeSpanAttributes(attributes);

  return Sentry.startSpan(
    {
      name,
      op,
      ...(safeAttributes ? { attributes: safeAttributes } : {}),
    },
    fn
  );
};

export const normalizeSentryRoute = (
  pathname?: string | null,
  segments?: readonly string[]
): string => {
  const normalizedPath = pathname?.split('?')[0]?.split('#')[0];

  switch (normalizedPath) {
    case '/':
      return '(tabs)/index';
    case '/timeline':
      return '(tabs)/timeline';
    case '/settings':
      return '(tabs)/settings';
    case '/add-edit-patient':
      return 'add-edit-patient';
    case '/add-edit-prescription':
      return 'add-edit-prescription';
    case '/prescription-detail':
      return 'prescription-detail';
    default:
      break;
  }

  const safeSegments = (segments ?? []).filter((segment) => {
    return segment.length > 0 && !segment.startsWith('[') && !segment.startsWith('+');
  });

  if (safeSegments.length === 0) {
    return '(tabs)/index';
  }

  return safeSegments.join('/');
};

export { Sentry };
