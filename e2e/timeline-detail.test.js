describe('Timeline and detail viewer', () => {
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
    const params = new URLSearchParams({
      photoUri: 'file://detox-preview.jpg',
      doctorName: 'Dr. Detox',
      doctorSpecialty: 'General Medicine',
      condition: 'Sample Condition',
      tags: 'night,demo',
      visitDate: '2025-02-01',
      notes: 'Detox preview',
    }).toString();

    await device.launchApp({
      newInstance: true,
      // Use triple slash so `prescription-detail` is parsed as a path, not host.
      url: `pillfolio:///prescription-detail?${params}`,
    });

    await device.disableSynchronization();
    try {
      await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(20000);
      await waitFor(element(by.id('prescription-detail-image'))).toBeVisible().withTimeout(20000);
      await element(by.id('prescription-detail-image')).tap();
      await waitFor(element(by.id('prescription-image-fullscreen'))).toBeVisible().withTimeout(10000);
      await element(by.id('prescription-image-close')).tap();
    } finally {
      await device.enableSynchronization();
    }
  });
});
