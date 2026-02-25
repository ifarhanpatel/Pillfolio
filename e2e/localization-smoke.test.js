describe("Localization smoke", () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id("patients-screen"))).toBeVisible().withTimeout(20000);
  });

  it("switches app language to Hindi and updates Timeline UI", async () => {
    await element(by.id("tab-settings")).tap();
    await waitFor(element(by.id("settings-screen"))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id("settings-language-option-hi"))).toBeVisible().withTimeout(10000);
    await element(by.id("settings-language-option-hi")).tap();

    await element(by.id("tab-timeline")).tap();
    await waitFor(element(by.id("timeline-screen"))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id("timeline-title"))).toBeVisible().withTimeout(10000);
    await expect(element(by.id("timeline-title"))).toHaveText("टाइमलाइन");
  });
});
