import { resources } from '@/src/i18n';

const collectKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return collectKeys(child, next);
    }

    return [next];
  });
};

describe('i18n resources', () => {
  it('keeps all locale resources in key parity with english', () => {
    const englishKeys = collectKeys(resources.en).sort();

    for (const [locale, resource] of Object.entries(resources)) {
      const localeKeys = collectKeys(resource).sort();
      expect(localeKeys).toEqual(englishKeys);

      for (const key of localeKeys) {
        const value = key.split('.').reduce<unknown>((acc, part) => {
          if (!acc || typeof acc !== 'object') {
            return undefined;
          }
          return (acc as Record<string, unknown>)[part];
        }, resource);
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      }

      expect(locale).toBeTruthy();
    }
  });
});

