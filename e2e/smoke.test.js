describe("App launch smoke test", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("shows the Patients screen", async () => {
    await expect(element(by.id("patients-screen"))).toBeVisible();
  });

  it("adds a prescription and navigates to detail", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await waitFor(element(by.id("prescription-form-screen")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id("prescription-photo-uri-input")).replaceText(
      "file://tmp/prescription.jpg"
    );
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Lee");
    await waitFor(element(by.id("prescription-condition-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scrollTo("bottom");
    await element(by.id("prescription-condition-input")).replaceText("Hypertension");
    await waitFor(element(by.id("prescription-tags-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scrollTo("bottom");
    await element(by.id("prescription-tags-input")).replaceText("bp,daily");
    await element(by.id("visit-date-today")).tap();
    await waitFor(element(by.id("prescription-save-button")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scrollTo("bottom");
    await element(by.id("prescription-save-button")).tap();

    await element(by.text("OK")).tap();
    await waitFor(element(by.id("prescription-detail-screen")))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id("prescription-detail-image"))).toBeVisible();
  });
});
