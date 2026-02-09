describe('Timeline and detail viewer', () => {
  it('opens the timeline tab', async () => {
    await device.launchApp({ newInstance: true });

    await element(by.id('tab-timeline')).tap();

    await expect(element(by.id('timeline-screen'))).toBeVisible();
    await expect(element(by.id('timeline-search-placeholder'))).toBeVisible();
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
      url: `pillfolio://prescription-detail?${params}`,
    });

    await expect(element(by.id('prescription-detail-screen'))).toBeVisible();
    await element(by.id('prescription-detail-image')).tap();
    await expect(element(by.id('prescription-image-fullscreen'))).toBeVisible();
    await element(by.id('prescription-image-close')).tap();
  });
});
