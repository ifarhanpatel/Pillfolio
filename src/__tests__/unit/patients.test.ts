import { createPatient, deletePatient, getPatientById, listPatients, updatePatient } from "../../db/patients";
import { FakeDriver } from "../helpers/fakeDriver";

describe("patients", () => {
  test("createPatient inserts and returns patient", async () => {
    const driver = new FakeDriver();
    const now = () => "2025-02-01T10:00:00.000Z";

    const patient = await createPatient(
      driver,
      { name: "Alex", relationship: "Self", gender: "female" },
      now
    );

    expect(patient.name).toBe("Alex");
    expect(patient.relationship).toBe("Self");
    expect(patient.gender).toBe("female");
    expect(patient.createdAt).toBe(now());
    expect(driver.patients).toHaveLength(1);
    expect(await getPatientById(driver, patient.id)).toEqual(patient);
  });

  test("listPatients orders by createdAt desc", async () => {
    const driver = new FakeDriver();
    await createPatient(driver, { name: "Older" }, () => "2025-01-01T00:00:00.000Z");
    await createPatient(driver, { name: "Newer" }, () => "2025-02-01T00:00:00.000Z");

    const patients = await listPatients(driver);

    expect(patients[0].name).toBe("Newer");
    expect(patients[1].name).toBe("Older");
  });

  test("getPatientById returns null for missing", async () => {
    const driver = new FakeDriver();

    const patient = await getPatientById(driver, "missing");

    expect(patient).toBeNull();
  });

  test("updatePatient updates name, relationship, and gender", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(
      driver,
      { name: "Alex", gender: "male" },
      () => "2025-01-01T00:00:00.000Z"
    );

    const updated = await updatePatient(
      driver,
      created.id,
      { name: "Alexis", relationship: "Parent", gender: "non-binary" },
      () => "2025-02-02T00:00:00.000Z"
    );

    expect(updated?.name).toBe("Alexis");
    expect(updated?.relationship).toBe("Parent");
    expect(updated?.gender).toBe("non-binary");
    expect(updated?.updatedAt).toBe("2025-02-02T00:00:00.000Z");
  });

  test("updatePatient preserves optional fields when omitted", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(
      driver,
      { name: "Alex", relationship: "Self", gender: "female" },
      () => "2025-01-01T00:00:00.000Z"
    );

    const updated = await updatePatient(
      driver,
      created.id,
      { name: "Alexis" },
      () => "2025-02-02T00:00:00.000Z"
    );

    expect(updated?.relationship).toBe("Self");
    expect(updated?.gender).toBe("female");
    expect(await getPatientById(driver, created.id)).toEqual(updated);
  });

  test("deletePatient removes patient", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    await deletePatient(driver, created.id);

    const patients = await listPatients(driver);
    expect(patients).toHaveLength(0);
  });

  test("createPatient propagates insert failures", async () => {
    const driver = new FakeDriver();
    const runSpy = jest
      .spyOn(driver, "runAsync")
      .mockRejectedValueOnce(new Error("insert failed"));

    await expect(
      createPatient(driver, { name: "Alex", gender: "female" })
    ).rejects.toThrow("insert failed");

    expect(runSpy).toHaveBeenCalled();
  });

  test("updatePatient propagates update failures", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(driver, { name: "Alex" });
    const runSpy = jest.spyOn(driver, "runAsync");
    runSpy.mockImplementation(async (sql, params) => {
      if (sql.startsWith("UPDATE patients")) {
        throw new Error("update failed");
      }
      return FakeDriver.prototype.runAsync.call(driver, sql, params);
    });

    await expect(
      updatePatient(driver, created.id, { name: "Alexis" })
    ).rejects.toThrow("update failed");
  });
});
