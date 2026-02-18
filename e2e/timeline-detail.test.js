describe('Timeline and detail viewer', () => {
  const ensureVisible = async (testID) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        try {
          await element(by.id('prescription-form-screen')).scroll(160, 'down', 0.5, 0.7);
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

  it('opens the timeline tab', async () => {
    await device.launchApp({ newInstance: true });

    await element(by.id('tab-timeline')).tap();

    await waitFor(element(by.id('timeline-screen'))).toBeVisible().withTimeout(15000);
    await expect(element(by.id('timeline-search-panel'))).toExist();
  });

  it('filters timeline cards with search input', async () => {
    await device.launchApp({ newInstance: true });
    await element(by.id('tab-timeline')).tap();
    await waitFor(element(by.id('timeline-search-input'))).toBeVisible().withTimeout(10000);

    await element(by.id('timeline-search-input')).replaceText('missing-term');
    await expect(element(by.id('timeline-empty-state'))).toBeVisible();
    await expect(element(by.id('timeline-search-clear'))).toBeVisible();
    await element(by.id('timeline-search-scope-toggle')).tap();
    await expect(element(by.text('Searching all patients'))).toBeVisible();
    await element(by.id('timeline-search-clear')).tap();
    await expect(element(by.id('timeline-search-input'))).toBeVisible();
  });

  it('opens fullscreen image viewer from detail screen', async () => {
    await device.launchApp({ newInstance: true });

    await element(by.id('patients-add-prescription-cta')).tap();
    await waitFor(element(by.id('prescription-form-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-photo-uri-input')).replaceText('file://tmp/fullscreen.jpg');
    await element(by.id('prescription-doctor-input')).replaceText('Dr. Detox');
    await ensureVisible('prescription-condition-input');
    await element(by.id('prescription-condition-input')).replaceText('Sample Condition');
    await ensureVisible('prescription-tags-input');
    await element(by.id('prescription-tags-input')).replaceText('night,demo');
    await ensureVisible('visit-date-today');
    await element(by.id('visit-date-today')).tap();
    await ensureVisible('prescription-save-button');
    await element(by.id('prescription-save-button')).tap();
    await dismissOkAlertIfPresent();

    await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id('prescription-detail-image'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-detail-image')).tap();
    await waitFor(element(by.id('prescription-image-fullscreen'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-image-close')).tap();
  });
});
