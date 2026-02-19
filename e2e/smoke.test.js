describe("App launch smoke test", () => {
  const waitForDetailScreen = async (timeoutMs = 60000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        await waitFor(element(by.id("prescription-detail-screen"))).toBeVisible().withTimeout(1500);
        return;
      } catch {
        // Continue polling; detail navigation can lag while main queue is busy in CI.
      }

      try {
        await waitFor(element(by.text("OK"))).toBeVisible().withTimeout(1000);
        await element(by.text("OK")).tap();
      } catch {
        // Alert may not be present on this iteration.
      }
    }

    throw new Error("Timed out waiting for prescription detail screen.");
  };

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
    await waitFor(element(by.text("Self"))).toBeVisible().withTimeout(20000);

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
    await waitForDetailScreen();
    await expect(element(by.id("prescription-detail-photo-uri"))).toBeVisible();
  });
});
