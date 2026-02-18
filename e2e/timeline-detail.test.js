describe('Timeline and detail viewer', () => {
  const scrollFormDown = async () => {
    await element(by.id('prescription-form-screen')).scroll(220, 'down', 0.5, 0.5);
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
    await scrollFormDown();
    await waitFor(element(by.id('prescription-condition-input'))).toBeVisible().withTimeout(5000);
    await element(by.id('prescription-condition-input')).replaceText('Sample Condition');
    await scrollFormDown();
    await waitFor(element(by.id('prescription-tags-input'))).toBeVisible().withTimeout(5000);
    await element(by.id('prescription-tags-input')).replaceText('night,demo');
    await element(by.id('visit-date-today')).tap();
    await scrollFormDown();
    await waitFor(element(by.id('prescription-save-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('prescription-save-button')).tap();
    await element(by.text('OK')).tap();

    await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id('prescription-detail-image'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-detail-image')).tap();
    await waitFor(element(by.id('prescription-image-fullscreen'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-image-close')).tap();
  });
});
