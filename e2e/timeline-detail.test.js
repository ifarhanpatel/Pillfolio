describe('Timeline and detail viewer', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('opens the timeline tab', async () => {
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

    await waitFor(element(by.id('patients-screen'))).toBeVisible().withTimeout(15000);
    await device.openURL({ url: `pillfolio:///prescription-detail?${params}` });

    await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(45000);
    await element(by.id('prescription-detail-image')).tap();
    await expect(element(by.id('prescription-image-fullscreen'))).toBeVisible();
    await element(by.id('prescription-image-close')).tap();
  });
});
