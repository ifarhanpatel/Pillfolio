import type { TranslationResource } from './en';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K] extends string
      ? string
      : T[K];
};

const merge = <T extends Record<string, unknown>>(base: T, overrides: DeepPartial<T>): T => {
  const output: Record<string, unknown> = { ...base };

  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const nextValue = overrides[key];
    if (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
      const current = base[key];
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        output[key as string] = merge(
          current as Record<string, unknown>,
          nextValue as DeepPartial<Record<string, unknown>>
        );
        continue;
      }
    }
    output[key as string] = nextValue as unknown;
  }

  return output as T;
};

export const withFallbackTranslations = (
  base: TranslationResource,
  overrides: DeepPartial<TranslationResource>
): TranslationResource => merge(base, overrides);
