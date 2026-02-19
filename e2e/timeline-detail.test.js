describe('Timeline and detail viewer', () => {
  const openDetailWithRetry = async (url) => {
    const attempts = [
      async () => {
        await device.launchApp({
          newInstance: true,
          delete: true,
          url,
        });
      },
      async () => {
        await device.launchApp({ newInstance: true, delete: true });
        await device.openURL({ url });
      },
    ];

    for (const attempt of attempts) {
      try {
        await attempt();
        await waitFor(element(by.id('prescription-detail-screen'))).toBeVisible().withTimeout(60000);
        return;
      } catch {
        // Try the next deep-link strategy.
      }
    }

    throw new Error('Unable to open prescription detail via deep link.');
  };

  it('opens the timeline tab', async () => {
    await device.launchApp({ newInstance: true, delete: true });

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

    await openDetailWithRetry(`pillfolio:///prescription-detail?${params}`);
    await element(by.id('prescription-detail-image')).tap();
    await expect(element(by.id('prescription-image-fullscreen'))).toBeVisible();
    await element(by.id('prescription-image-close')).tap();
  });
});
