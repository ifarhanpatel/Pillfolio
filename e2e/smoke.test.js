describe("App launch smoke test", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("shows the Patients screen", async () => {
    await expect(element(by.id("patients-screen"))).toBeVisible();
  });
});
