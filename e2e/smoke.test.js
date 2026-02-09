describe("App launch smoke test", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("shows the Patients screen", async () => {
    await expect(element(by.id("patients-screen"))).toBeVisible();
  });

  it("adds a prescription and navigates to detail", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await expect(element(by.id("prescription-form-screen"))).toBeVisible();

    await element(by.id("prescription-photo-uri-input")).typeText("file://tmp/prescription.jpg");
    await element(by.id("prescription-doctor-input")).typeText("Dr. Lee");
    await element(by.id("prescription-condition-input")).typeText("Hypertension");
    await element(by.id("prescription-tags-input")).typeText("bp,daily");
    await element(by.id("prescription-save-button")).tap();

    await element(by.text("OK")).tap();
    await expect(element(by.id("prescription-detail-screen"))).toBeVisible();
    await expect(element(by.id("prescription-detail-photo-uri"))).toBeVisible();
  });
});
