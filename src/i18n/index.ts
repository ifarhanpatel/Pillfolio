import { bn } from './resources/bn';
import { en, type TranslationResource } from './resources/en';
import { hi } from './resources/hi';
import { mr } from './resources/mr';
import { ta } from './resources/ta';
import { te } from './resources/te';
import type { AppLocaleCode } from './types';

export const resources: Record<AppLocaleCode, TranslationResource> = {
  en,
  hi,
  bn,
  ta,
  te,
  mr,
};

type Primitive = string | number | boolean;
type TranslateOptions = {
  count?: number;
  [key: string]: Primitive | undefined;
};

const getPath = (obj: Record<string, unknown>, key: string): unknown => {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') {
      return undefined;
    }
    return (acc as Record<string, unknown>)[part];
  }, obj);
};

const interpolate = (template: string, params: Record<string, Primitive | undefined>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? '' : String(value);
  });
};

export const translate = (
  locale: AppLocaleCode,
  key: string,
  options: TranslateOptions = {}
): string => {
  const localeResource = resources[locale] ?? resources.en;
  let resolvedKey = key;
  if (typeof options.count === 'number') {
    const pluralKey = `${key}_${options.count === 1 ? 'one' : 'other'}`;
    if (typeof getPath(localeResource as unknown as Record<string, unknown>, pluralKey) === 'string') {
      resolvedKey = pluralKey;
    }
  }

  const localized = getPath(localeResource as unknown as Record<string, unknown>, resolvedKey);
  const fallback = getPath(resources.en as unknown as Record<string, unknown>, resolvedKey);
  const template =
    typeof localized === 'string' ? localized : typeof fallback === 'string' ? fallback : resolvedKey;

  return interpolate(template, options);
};

export type TranslationKey = string;

