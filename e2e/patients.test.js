describe("Patient CRUD flows", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("creates and edits a patient", async () => {
    await element(by.id("patients-cta")).tap();
    await expect(element(by.id("patient-form-screen"))).toBeVisible();

    await element(by.id("patient-form-name-input")).replaceText("Alex");
    await element(by.id("patient-form-relationship-input")).replaceText("Self");
    await element(by.id("patient-form-save-button")).tap();

    await expect(element(by.id("patients-screen"))).toBeVisible();
    await expect(element(by.text("Alex"))).toBeVisible();

    await element(by.id("patient-edit-alex")).tap();
    await expect(element(by.id("patient-form-screen"))).toBeVisible();
    await element(by.id("patient-form-name-input")).replaceText("Alex Updated");
    await element(by.id("patient-form-save-button")).tap();

    await expect(element(by.text("Alex Updated"))).toBeVisible();
  });

  it("deletes a patient with delete-all action", async () => {
    await element(by.id("patients-cta")).tap();
    await element(by.id("patient-form-name-input")).replaceText("Delete Me");
    await element(by.id("patient-form-save-button")).tap();

    await expect(element(by.text("Delete Me"))).toBeVisible();

    await element(by.id("patient-delete-delete-me")).tap();
    await expect(element(by.id("delete-patient-modal"))).toBeVisible();
    await element(by.id("delete-patient-delete-all-button")).tap();

    await expect(element(by.id("patients-screen"))).toBeVisible();
  });

  it("deletes a patient with reassignment action", async () => {
    await element(by.id("patients-cta")).tap();
    await element(by.id("patient-form-name-input")).replaceText("Reassign Source");
    await element(by.id("patient-form-save-button")).tap();

    await element(by.id("patients-cta")).tap();
    await element(by.id("patient-form-name-input")).replaceText("Reassign Target");
    await element(by.id("patient-form-save-button")).tap();

    await expect(element(by.text("Reassign Source"))).toBeVisible();
    await expect(element(by.text("Reassign Target"))).toBeVisible();

    await element(by.id("patient-delete-reassign-source")).tap();
    await expect(element(by.id("delete-patient-modal"))).toBeVisible();
    await element(by.id("delete-patient-reassign-button")).tap();

    await expect(element(by.text("Reassign Target"))).toBeVisible();
  });
});
