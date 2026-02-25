describe('Timeline and detail viewer', () => {
  const isFocusLossError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('No activities in stage RESUMED') ||
      message.includes('root of the view hierarchy to have window focus')
    );
  };

  const withFocusRecovery = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      if (!isFocusLossError(error)) {
        throw error;
      }

      await device.launchApp({ newInstance: false });
      return operation();
    }
  };

  const waitForVisibleById = async (testID, timeoutMs) =>
    withFocusRecovery(() =>
      waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeoutMs)
    );

  const tapById = async (testID, timeoutMs = 10000) =>
    withFocusRecovery(async () => {
      await waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeoutMs);
      await element(by.id(testID)).tap();
    });

  const ensureVisible = async (testID) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        try {
          await element(by.id('prescription-form-screen')).scroll(180, 'down', 0.5, 0.2);
        } catch {
          // Ignore scroll failures; view may already be at bottom.
        }
      }
    }

    await expect(element(by.id(testID))).toBeVisible();
  };

  const dismissOkAlertIfPresent = async () => {
    try {
      await waitFor(element(by.text('OK'))).toBeVisible().withTimeout(2500);
      await element(by.text('OK')).tap();
    } catch {
      // Some iOS runs navigate without rendering the Alert button.
    }
  };

  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitForVisibleById('patients-screen', 20000);
  });

  it('opens the timeline tab', async () => {
    await tapById('tab-timeline');
    await waitForVisibleById('timeline-screen', 20000);
    await expect(element(by.id('timeline-search-panel'))).toExist();
  });

  it('filters timeline cards with search input', async () => {
    await tapById('tab-timeline');
    await waitForVisibleById('timeline-search-input', 15000);

    await element(by.id('timeline-search-input')).replaceText('missing-term');
    await expect(element(by.id('timeline-empty-state'))).toBeVisible();
    await element(by.id('timeline-search-scope-toggle')).tap();
    await expect(element(by.id('timeline-search-scope-toggle'))).toBeVisible();
    await element(by.id('timeline-search-input')).replaceText('');
    await expect(element(by.id('timeline-search-input'))).toBeVisible();
  });

  it('opens fullscreen image viewer from detail screen', async () => {
    await element(by.id('patients-add-prescription-cta')).tap();
    await waitForVisibleById('prescription-form-screen', 15000);
    await waitForVisibleById('prescription-photo-uri-input', 20000);
    await element(by.id('prescription-photo-uri-input')).replaceText('e2e-fixture');
    await element(by.id('prescription-doctor-input')).replaceText('Dr. Detox');
    try {
      await element(by.id('prescription-doctor-input')).tapReturnKey();
    } catch {}
    await ensureVisible('prescription-condition-input');
    await element(by.id('prescription-condition-input')).replaceText('Sample Condition');
    await ensureVisible('prescription-tags-input');
    await element(by.id('prescription-tags-input')).replaceText('night,demo');
    try {
      await element(by.id('prescription-tags-input')).tapReturnKey();
    } catch {}
    await ensureVisible('visit-date-today');
    await element(by.id('visit-date-today')).tap();
    await ensureVisible('prescription-save-button');
    await element(by.id('prescription-save-button')).tap();
    await dismissOkAlertIfPresent();

    await waitForVisibleById('prescription-detail-back', 20000);
    await waitForVisibleById('prescription-detail-image', 10000);
    await tapById('prescription-detail-image');
    await waitForVisibleById('prescription-image-fullscreen', 10000);
    await tapById('prescription-image-close');
  });
});
