describe("App launch smoke test", () => {
  const dismissSuccessAlertIfPresent = async () => {
    try {
      await waitFor(element(by.text("OK"))).toBeVisible().withTimeout(2000);
      await element(by.text("OK")).tap();
    } catch {
      // Alert may auto-dismiss or not render consistently across simulator runs.
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
    await expect(element(by.id("prescription-form-screen"))).toBeVisible();

    await element(by.id("prescription-photo-uri-input")).replaceText(
      "file://tmp/prescription.jpg"
    );
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Lee");
    await waitFor(element(by.id("prescription-condition-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scroll(120, "down", 0.5, 0.5);
    await element(by.id("prescription-condition-input")).replaceText("Hypertension");
    await waitFor(element(by.id("prescription-tags-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scroll(120, "down", 0.5, 0.5);
    await element(by.id("prescription-tags-input")).replaceText("bp,daily");

    // Dismiss the keyboard, then jump to bottom to avoid flaky incremental scrolls.
    await element(by.id("prescription-form-screen")).tapAtPoint({ x: 16, y: 16 });
    await element(by.id("prescription-form-screen")).scrollTo("bottom");
    await waitFor(element(by.id("prescription-save-button"))).toBeVisible().withTimeout(5000);
    await element(by.id("prescription-save-button")).tap();

    await dismissSuccessAlertIfPresent();
    await waitFor(element(by.id("prescription-detail-screen"))).toBeVisible().withTimeout(15000);
    await expect(element(by.id("prescription-detail-photo-uri"))).toBeVisible();
  });
});
