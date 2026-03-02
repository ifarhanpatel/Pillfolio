describe('sentry service', () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const originalNodeEnv = process.env.NODE_ENV;

  const loadSentryService = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const service = require('../../services/sentry');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sentry = require('@sentry/react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asyncStorage = require('@react-native-async-storage/async-storage');

    return {
      ...service,
      sentry,
      asyncStorage,
    };
  };

  beforeEach(() => {
    jest.resetModules();
    Object.assign(process.env, {
      NODE_ENV: 'development',
      EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
    });
  });

  afterAll(() => {
    Object.assign(process.env, {
      NODE_ENV: originalNodeEnv,
      EXPO_PUBLIC_SENTRY_DSN: originalDsn,
    });
  });

  it('skips initialization when DSN is missing', async () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;

    const { initializeSentry, sentry } = loadSentryService();

    initializeSentry();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('skips initialization in test environment', async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
    });

    const { initializeSentry, sentry } = loadSentryService();

    initializeSentry();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('initializes only once per module lifecycle', async () => {
    const { initializeSentry, sentry } = loadSentryService();

    initializeSentry();
    initializeSentry();

    expect(sentry.init).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing anonymous install id', async () => {
    const { configureSentryIdentity, sentry, asyncStorage } = loadSentryService();

    await asyncStorage.setItem('pillfolio.sentry.install-id', 'install_existing');
    await configureSentryIdentity();

    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'install_existing' });
    expect(asyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('creates and persists an anonymous install id when missing', async () => {
    const { configureSentryIdentity, sentry, asyncStorage } = loadSentryService();

    await configureSentryIdentity();

    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      'pillfolio.sentry.install-id',
      expect.stringMatching(/^install_/)
    );
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: expect.stringMatching(/^install_/),
    });
    expect(sentry.setTag).toHaveBeenCalledWith('identity_kind', 'anonymous_install');
  });

  it('drops blocked keys from breadcrumb payloads', async () => {
    const { addSentryBreadcrumb, sentry } = loadSentryService();

    addSentryBreadcrumb({
      category: 'settings',
      message: 'test',
      data: {
        safe_flag: true,
        count: 2,
        name: 'Sensitive',
        photoUri: 'file://secret.jpg',
      } as never,
    });

    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'settings',
      message: 'test',
      level: 'info',
      data: {
        safe_flag: true,
        count: 2,
      },
    });
  });

  it('drops blocked keys from exception context payloads', async () => {
    const { captureSentryException, sentry } = loadSentryService();

    captureSentryException(new Error('boom'), {
      area: 'backup',
      action: 'export',
      data: {
        ok: true,
        doctorName: 'Hidden',
        notes: 'Hidden',
      } as never,
    });

    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: {
          error_context: {
            area: 'backup',
            action: 'export',
            ok: true,
          },
        },
      })
    );
  });

  it('returns span results and rethrows span errors unchanged', async () => {
    const { withSentrySpan } = loadSentryService();

    await expect(
      withSentrySpan('success', 'backup', async () => 'done', {
        safe: true,
      })
    ).resolves.toBe('done');

    const error = new Error('span failed');
    await expect(
      withSentrySpan('failure', 'backup', async () => {
        throw error;
      })
    ).rejects.toBe(error);
  });

  it('normalizes routes without leaking params', async () => {
    const { normalizeSentryRoute } = loadSentryService();

    expect(normalizeSentryRoute('/prescription-detail?id=abc123')).toBe('prescription-detail');
    expect(normalizeSentryRoute(undefined, ['(tabs)', 'timeline', '[id]'])).toBe('(tabs)/timeline');
  });
});
