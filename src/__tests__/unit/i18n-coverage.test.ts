import { resources } from '@/src/i18n';

type FlatMap = Record<string, string>;

const flattenStrings = (value: unknown, prefix = ''): FlatMap => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const output: FlatMap = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(output, flattenStrings(child, next));
      continue;
    }

    if (typeof child === 'string') {
      output[next] = child;
    }
  }
  return output;
};

const COVERAGE_PREFIXES = [
  'common.',
  'tabs.',
  'settings.',
  'patients.',
  'patientForm.',
  'timeline.',
  'prescriptionForm.',
  'prescriptionDetail.',
  'validation.',
];

const EQUALITY_ALLOWLIST = new Set<string>([
  'prescriptionForm.tagsPlaceholder',
  'prescriptionForm.photoUriPlaceholder',
]);

describe('i18n coverage', () => {
  it('avoids english fallback values in supported non-english locales for user-facing namespaces', () => {
    const english = flattenStrings(resources.en);
    const nonEnglishLocales = Object.entries(resources).filter(([code]) => code !== 'en');

    const failures: string[] = [];

    for (const [locale, resource] of nonEnglishLocales) {
      const flat = flattenStrings(resource);

      for (const [key, enValue] of Object.entries(english)) {
        if (!COVERAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          continue;
        }

        if (EQUALITY_ALLOWLIST.has(key)) {
          continue;
        }

        const localized = flat[key];
        if (typeof localized !== 'string') {
          continue;
        }

        if (localized === enValue) {
          failures.push(`${locale}:${key}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

