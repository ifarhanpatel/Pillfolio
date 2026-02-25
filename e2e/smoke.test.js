describe("App launch smoke test", () => {
  const isFocusLossError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("No activities in stage RESUMED") ||
      message.includes("root of the view hierarchy to have window focus")
    );
  };

  const withFocusRecovery = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      if (!isFocusLossError(error)) {
        throw error;
      }

      await device.launchApp({ newInstance: false });
      return operation();
    }
  };

  const waitForVisibleById = async (testID, timeoutMs) =>
    withFocusRecovery(() =>
      waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeoutMs)
    );

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
    await waitForVisibleById("patients-screen", 20000);
  });

  it("shows the Patients screen", async () => {
    await expect(element(by.id("patients-screen"))).toBeVisible();
  });

  it("adds a prescription and navigates to detail", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await waitForVisibleById("prescription-form-screen", 15000);
    await waitForVisibleById("prescription-photo-uri-input", 20000);

    await element(by.id("prescription-photo-uri-input")).replaceText("e2e-fixture");
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Lee");
    try {
      await element(by.id("prescription-doctor-input")).tapReturnKey();
    } catch {}
    await ensureVisible("prescription-condition-input");
    await element(by.id("prescription-condition-input")).replaceText("Hypertension");
    await ensureVisible("prescription-tags-input");
    await element(by.id("prescription-tags-input")).replaceText("bp,daily");
    try {
      await element(by.id("prescription-tags-input")).tapReturnKey();
    } catch {}
    await ensureVisible("visit-date-today");
    await element(by.id("visit-date-today")).tap();
    await ensureVisible("prescription-save-button");
    await element(by.id("prescription-save-button")).tap();

    await dismissOkAlertIfPresent();
    await waitForVisibleById("prescription-detail-back", 20000);
    await expect(element(by.id("prescription-detail-image"))).toBeVisible();
  });
});
