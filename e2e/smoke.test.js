describe("App launch smoke test", () => {
  const ensureVisible = async (testID) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        try {
          await element(by.id("prescription-form-screen")).scroll(180, "down", 0.5, 0.2);
        } catch {
          // Ignore scroll failures; some runs are already at bottom.
        }
      }
    }

    await expect(element(by.id(testID))).toBeVisible();
  };

  const dismissOkAlertIfPresent = async () => {
    try {
      await waitFor(element(by.text("OK"))).toBeVisible().withTimeout(2500);
      await element(by.text("OK")).tap();
    } catch {
      // Some iOS runs navigate without rendering the Alert button.
    }
  };

  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it("shows the Patients screen", async () => {
    await expect(element(by.id("patients-screen"))).toBeVisible();
  });

  it("adds a prescription and navigates to detail", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await waitFor(element(by.id("prescription-form-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await waitFor(element(by.text("Self"))).toBeVisible().withTimeout(20000);

    await element(by.id("prescription-photo-uri-input")).replaceText("e2e-fixture");
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Lee");
    try {
      await element(by.id("prescription-doctor-input")).tapReturnKey();
    } catch {}
    await ensureVisible("prescription-condition-input");
    await element(by.id("prescription-condition-input")).replaceText("Hypertension");
    await ensureVisible("prescription-tags-input");
    await element(by.id("prescription-tags-input")).replaceText("bp,daily");
    await ensureVisible("visit-date-today");
    await element(by.id("visit-date-today")).tap();
    await ensureVisible("prescription-save-button");
    await element(by.id("prescription-save-button")).tap();

    await dismissOkAlertIfPresent();
    await waitFor(element(by.id("prescription-detail-screen")))
      .toBeVisible()
      .withTimeout(20000);
    await expect(element(by.id("prescription-detail-image"))).toBeVisible();
  });
});
