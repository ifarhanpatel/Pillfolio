describe("Prescription edit and delete flows", () => {
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

  it("edits and then deletes a prescription", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await expect(element(by.id("prescription-form-screen"))).toBeVisible();
    await waitFor(element(by.text("Self"))).toBeVisible().withTimeout(20000);

    await element(by.id("prescription-photo-uri-input")).replaceText("file://tmp/prescription-edit.jpg");
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Initial");
    await waitFor(element(by.id("prescription-condition-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scroll(120, "down", 0.5, 0.5);
    await element(by.id("prescription-condition-input")).replaceText("Initial Condition");
    await waitFor(element(by.id("prescription-tags-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scroll(120, "down", 0.5, 0.5);
    await element(by.id("prescription-tags-input")).replaceText("initial,tag");

    await element(by.id("prescription-form-screen")).tapAtPoint({ x: 16, y: 16 });
    await element(by.id("prescription-form-screen")).scrollTo("bottom");
    await waitFor(element(by.id("prescription-save-button"))).toBeVisible().withTimeout(5000);
    await element(by.id("prescription-save-button")).tap();

    await dismissSuccessAlertIfPresent();
    await expect(element(by.id("prescription-detail-screen"))).toBeVisible();

    await element(by.id("prescription-detail-edit")).tap();
    await expect(element(by.id("prescription-form-screen"))).toBeVisible();

    await element(by.id("prescription-doctor-input")).replaceText("Dr. Updated");
    await waitFor(element(by.id("prescription-condition-input")))
      .toBeVisible()
      .whileElement(by.id("prescription-form-screen"))
      .scroll(120, "down", 0.5, 0.5);
    await element(by.id("prescription-condition-input")).replaceText("Updated Condition");

    await element(by.id("prescription-form-screen")).tapAtPoint({ x: 16, y: 16 });
    await element(by.id("prescription-form-screen")).scrollTo("bottom");
    await waitFor(element(by.id("prescription-save-button"))).toBeVisible().withTimeout(5000);
    await element(by.id("prescription-save-button")).tap();

    await dismissSuccessAlertIfPresent();
    await expect(element(by.id("prescription-detail-screen"))).toBeVisible();
    await expect(element(by.text("Dr. Updated"))).toBeVisible();
    await expect(element(by.text("Updated Condition"))).toBeVisible();

    await element(by.id("prescription-detail-delete")).tap();
    await waitFor(element(by.text("Delete"))).toBeVisible().withTimeout(5000);
    await element(by.text("Delete")).tap();

    await expect(element(by.id("timeline-screen"))).toBeVisible();
  });
});
