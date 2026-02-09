import { createPatient, deletePatient, getPatientById, listPatients, updatePatient } from "../../db/patients";
import { FakeDriver } from "../helpers/fakeDriver";

describe("patients", () => {
  test("createPatient inserts and returns patient", async () => {
    const driver = new FakeDriver();
    const now = () => "2025-02-01T10:00:00.000Z";

    const patient = await createPatient(driver, { name: "Alex", relationship: "Self" }, now);

    expect(patient.name).toBe("Alex");
    expect(patient.relationship).toBe("Self");
    expect(patient.createdAt).toBe(now());
    expect(driver.patients).toHaveLength(1);
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

  test("updatePatient updates name and relationship", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    const updated = await updatePatient(driver, created.id, { name: "Alexis", relationship: "Parent" }, () => "2025-02-02T00:00:00.000Z");

    expect(updated?.name).toBe("Alexis");
    expect(updated?.relationship).toBe("Parent");
    expect(updated?.updatedAt).toBe("2025-02-02T00:00:00.000Z");
  });

  test("deletePatient removes patient", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    await deletePatient(driver, created.id);

    const patients = await listPatients(driver);
    expect(patients).toHaveLength(0);
  });
});
