describe('Timeline and detail viewer', () => {
  it('opens the timeline tab', async () => {
    await device.launchApp({ newInstance: true });

    await element(by.id('tab-timeline')).tap();

    await expect(element(by.id('timeline-screen'))).toBeVisible();
    await expect(element(by.id('timeline-search-panel'))).toBeVisible();
  });

  it('filters timeline cards with search input', async () => {
    await device.launchApp({ newInstance: true });

    await element(by.id('patients-add-prescription-cta')).tap();
    await expect(element(by.id('prescription-form-screen'))).toBeVisible();

    await element(by.id('prescription-photo-uri-input')).replaceText('file://tmp/searchable.jpg');
    await element(by.id('prescription-doctor-input')).replaceText('Dr. Search');
    await waitFor(element(by.id('prescription-condition-input')))
      .toBeVisible()
      .whileElement(by.id('prescription-form-screen'))
      .scroll(120, 'down');
    await element(by.id('prescription-condition-input')).replaceText('SearchCondition');
    await waitFor(element(by.id('prescription-tags-input')))
      .toBeVisible()
      .whileElement(by.id('prescription-form-screen'))
      .scroll(120, 'down');
    await element(by.id('prescription-tags-input')).replaceText('search-tag');
    await waitFor(element(by.id('prescription-save-button')))
      .toBeVisible()
      .whileElement(by.id('prescription-form-screen'))
      .scroll(200, 'down');
    await element(by.id('prescription-save-button')).tap();
    await element(by.text('OK')).tap();

    await device.launchApp({ newInstance: true });
    await element(by.id('tab-timeline')).tap();
    await waitFor(element(by.id('timeline-search-input'))).toBeVisible().withTimeout(10000);

    await element(by.id('timeline-search-input')).replaceText('searchcondition');
    await expect(element(by.text('Dr. Search'))).toBeVisible();

    await element(by.id('timeline-search-input')).replaceText('missing-term');
    await expect(element(by.id('timeline-empty-state'))).toBeVisible();
    await element(by.id('timeline-search-clear')).tap();
    await expect(element(by.text('Dr. Search'))).toBeVisible();
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

    await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('prescription-detail-image')).tap();
    await expect(element(by.id('prescription-image-fullscreen'))).toBeVisible();
    await element(by.id('prescription-image-close')).tap();
  });
});
