describe("Localization smoke", () => {
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

  const tapById = async (testID, timeoutMs = 10000) =>
    withFocusRecovery(async () => {
      await waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeoutMs);
      await element(by.id(testID)).tap();
    });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitForVisibleById("patients-screen", 20000);
  });

  it("switches app language to Hindi and updates Timeline UI", async () => {
    await tapById("tab-settings");
    await waitForVisibleById("settings-language-option-hi", 10000);
    await tapById("settings-language-option-hi");

    await tapById("tab-timeline");
    await waitForVisibleById("timeline-screen", 10000);
    await waitForVisibleById("timeline-title", 10000);
    await expect(element(by.id("timeline-title"))).toHaveText("टाइमलाइन");
  });
});
