import {
  createPatient,
  deletePatient,
  deletePatientWithStrategy,
  getPatientById,
  listPatients,
  updatePatient,
} from "../../db/patients";
import { createPrescription, listPrescriptionsByPatient } from "../../db/prescriptions";
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
    expect(patient.isPrimary).toBe(false);
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

  test("listPatients places primary patients first", async () => {
    const driver = new FakeDriver();
    await createPatient(driver, { name: "Older" }, () => "2025-01-01T00:00:00.000Z");
    await createPatient(driver, { name: "Newer", isPrimary: true }, () => "2025-02-01T00:00:00.000Z");

    const patients = await listPatients(driver);

    expect(patients[0].name).toBe("Newer");
    expect(patients[0].isPrimary).toBe(true);
  });

  test("listPatients includes prescriptionsCount per patient", async () => {
    const driver = new FakeDriver();
    const alex = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");
    const taylor = await createPatient(driver, { name: "Taylor" }, () => "2025-02-01T00:00:00.000Z");

    await createPrescription(driver, {
      patientId: taylor.id,
      photoUri: "file:///rx-1.jpg",
      doctorName: "Dr. Lee",
      condition: "Cold",
      tags: ["morning"],
      visitDate: "2025-01-01",
    });
    await createPrescription(driver, {
      patientId: taylor.id,
      photoUri: "file:///rx-2.jpg",
      doctorName: "Dr. Lee",
      condition: "Flu",
      tags: ["night"],
      visitDate: "2025-01-02",
    });

    const patients = await listPatients(driver);

    expect(patients.find((patient) => patient.id === taylor.id)?.prescriptionsCount).toBe(2);
    expect(patients.find((patient) => patient.id === alex.id)?.prescriptionsCount).toBe(0);
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
    expect(updated?.isPrimary).toBe(false);
    expect(await getPatientById(driver, created.id)).toEqual(updated);
  });

  test("createPatient marks one primary patient at a time", async () => {
    const driver = new FakeDriver();
    const first = await createPatient(driver, { name: "Alex", isPrimary: true });
    const second = await createPatient(driver, { name: "Taylor", isPrimary: true });

    expect((await getPatientById(driver, first.id))?.isPrimary).toBe(false);
    expect((await getPatientById(driver, second.id))?.isPrimary).toBe(true);
  });

  test("updatePatient can promote a different primary patient", async () => {
    const driver = new FakeDriver();
    const first = await createPatient(driver, { name: "Alex", isPrimary: true });
    const second = await createPatient(driver, { name: "Taylor" });

    await updatePatient(driver, second.id, { name: "Taylor", isPrimary: true });

    expect((await getPatientById(driver, first.id))?.isPrimary).toBe(false);
    expect((await getPatientById(driver, second.id))?.isPrimary).toBe(true);
  });

  test("deletePatient removes patient", async () => {
    const driver = new FakeDriver();
    const created = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    await deletePatient(driver, created.id);

    const patients = await listPatients(driver);
    expect(patients).toHaveLength(0);
  });

  test("deletePatientWithStrategy delete-all removes patient and prescriptions", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" });
    await createPrescription(driver, {
      patientId: patient.id,
      photoUri: "file:///rx.jpg",
      doctorName: "Dr. Lee",
      condition: "Cold",
      tags: ["morning"],
      visitDate: "2025-01-01",
    });

    await deletePatientWithStrategy(driver, patient.id, { type: "delete-all" });

    expect(await getPatientById(driver, patient.id)).toBeNull();
    expect(await listPrescriptionsByPatient(driver, patient.id)).toHaveLength(0);
  });

  test("deletePatientWithStrategy reassign moves prescriptions then deletes source patient", async () => {
    const driver = new FakeDriver();
    const sourcePatient = await createPatient(driver, { name: "Alex" });
    const targetPatient = await createPatient(driver, { name: "Taylor" });
    await createPrescription(driver, {
      patientId: sourcePatient.id,
      photoUri: "file:///rx.jpg",
      doctorName: "Dr. Lee",
      condition: "Cold",
      tags: ["morning"],
      visitDate: "2025-01-01",
    });

    await deletePatientWithStrategy(driver, sourcePatient.id, {
      type: "reassign",
      targetPatientId: targetPatient.id,
    });

    expect(await getPatientById(driver, sourcePatient.id)).toBeNull();
    expect(await listPrescriptionsByPatient(driver, sourcePatient.id)).toHaveLength(0);
    expect(await listPrescriptionsByPatient(driver, targetPatient.id)).toHaveLength(1);
  });

  test("deletePatientWithStrategy rejects invalid reassignment target", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" });

    await expect(
      deletePatientWithStrategy(driver, patient.id, {
        type: "reassign",
        targetPatientId: patient.id,
      })
    ).rejects.toThrow("A different target patient is required for reassignment.");
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
