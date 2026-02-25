describe("Prescription edit and delete flows", () => {
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

  const dismissSuccessAlertIfPresent = async () => {
    try {
      await waitFor(element(by.text("OK"))).toBeVisible().withTimeout(2000);
      await element(by.text("OK")).tap();
    } catch {
      // Alert may auto-dismiss or not render consistently across simulator runs.
    }
  };

  const ensureVisible = async (testID) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        try {
          await element(by.id("prescription-form-screen")).scroll(180, "down", 0.5, 0.2);
        } catch {
          // Ignore scroll failures; view may already be at bottom.
        }
      }
    }
    await expect(element(by.id(testID))).toBeVisible();
  };

  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitForVisibleById("patients-screen", 20000);
  });

  it("edits and then deletes a prescription", async () => {
    await element(by.id("patients-add-prescription-cta")).tap();
    await waitForVisibleById("prescription-form-screen", 15000);
    await waitForVisibleById("prescription-photo-uri-input", 20000);

    await element(by.id("prescription-photo-uri-input")).replaceText("e2e-fixture");
    await element(by.id("prescription-doctor-input")).replaceText("Dr. Initial");
    await ensureVisible("prescription-condition-input");
    await element(by.id("prescription-condition-input")).replaceText("Initial Condition");
    await ensureVisible("prescription-tags-input");
    await element(by.id("prescription-tags-input")).replaceText("initial,tag");
    try {
      await element(by.id("prescription-tags-input")).tapReturnKey();
    } catch {}

    await ensureVisible("prescription-save-button");
    await element(by.id("prescription-save-button")).tap();

    await dismissSuccessAlertIfPresent();
    await waitForVisibleById("prescription-detail-back", 20000);

    await element(by.id("prescription-detail-edit")).tap();
    await waitForVisibleById("prescription-form-screen", 15000);

    await element(by.id("prescription-doctor-input")).replaceText("Dr. Updated");
    await ensureVisible("prescription-condition-input");
    await element(by.id("prescription-condition-input")).replaceText("Updated Condition");
    try {
      await element(by.id("prescription-condition-input")).tapReturnKey();
    } catch {}

    await ensureVisible("prescription-save-button");
    await element(by.id("prescription-save-button")).tap();

    await dismissSuccessAlertIfPresent();
    await waitForVisibleById("prescription-detail-back", 20000);
    await expect(element(by.text("Dr. Updated"))).toBeVisible();
    await expect(element(by.text("Updated Condition"))).toBeVisible();

    await element(by.id("prescription-detail-delete")).tap();
    await waitFor(element(by.text("Delete"))).toBeVisible().withTimeout(5000);
    await element(by.text("Delete")).tap();

    await expect(element(by.id("timeline-screen"))).toBeVisible();
  });
});
