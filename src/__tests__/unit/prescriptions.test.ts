import { createPatient } from "../../db/patients";
import {
  createPrescription,
  deletePrescription,
  getPrescriptionById,
  listPrescriptionsByPatient,
  searchPrescriptions,
  updatePrescription,
} from "../../db/prescriptions";
import { FakeDriver } from "../helpers/fakeDriver";

describe("prescriptions", () => {
  test("createPrescription inserts and returns prescription", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    const prescription = await createPrescription(
      driver,
      {
        patientId: patient.id,
        photoUri: "file://photo.jpg",
        doctorName: "Dr. Lee",
        condition: "Hypertension",
        tags: ["bp", "daily"],
        visitDate: "2025-02-01",
      },
      () => "2025-02-01T10:00:00.000Z"
    );

    expect(prescription.patientId).toBe(patient.id);
    expect(prescription.tags).toEqual(["bp", "daily"]);
    expect(driver.prescriptions).toHaveLength(1);
    expect(await getPrescriptionById(driver, prescription.id)).toEqual(
      prescription
    );
  });

  test("listPrescriptionsByPatient orders by visitDate desc", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");

    await createPrescription(
      driver,
      {
        patientId: patient.id,
        photoUri: "file://old.jpg",
        doctorName: "Dr. Old",
        condition: "Migraine",
        tags: ["headache"],
        visitDate: "2025-01-10",
      },
      () => "2025-01-10T10:00:00.000Z"
    );

    await createPrescription(
      driver,
      {
        patientId: patient.id,
        photoUri: "file://new.jpg",
        doctorName: "Dr. New",
        condition: "Flu",
        tags: ["flu"],
        visitDate: "2025-02-10",
      },
      () => "2025-02-10T10:00:00.000Z"
    );

    const prescriptions = await listPrescriptionsByPatient(driver, patient.id);

    expect(prescriptions[0].doctorName).toBe("Dr. New");
    expect(prescriptions[1].doctorName).toBe("Dr. Old");
  });

  test("getPrescriptionById returns null for missing", async () => {
    const driver = new FakeDriver();

    const prescription = await getPrescriptionById(driver, "missing");

    expect(prescription).toBeNull();
  });

  test("updatePrescription updates fields", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");
    const created = await createPrescription(
      driver,
      {
        patientId: patient.id,
        photoUri: "file://photo.jpg",
        doctorName: "Dr. Lee",
        condition: "Hypertension",
        tags: ["bp"],
        visitDate: "2025-02-01",
      },
      () => "2025-02-01T10:00:00.000Z"
    );

    const updated = await updatePrescription(
      driver,
      created.id,
      {
        condition: "High blood pressure",
        tags: ["bp", "daily"],
        notes: "Take with food",
      },
      () => "2025-02-02T10:00:00.000Z"
    );

    expect(updated?.condition).toBe("High blood pressure");
    expect(updated?.tags).toEqual(["bp", "daily"]);
    expect(updated?.notes).toBe("Take with food");
    expect(updated?.updatedAt).toBe("2025-02-02T10:00:00.000Z");
    expect(await getPrescriptionById(driver, created.id)).toEqual(updated);
  });

  test("updatePrescription returns null when missing", async () => {
    const driver = new FakeDriver();

    const updated = await updatePrescription(driver, "missing", { condition: "x" });

    expect(updated).toBeNull();
  });

  test("deletePrescription removes row", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" }, () => "2025-01-01T00:00:00.000Z");
    const created = await createPrescription(
      driver,
      {
        patientId: patient.id,
        photoUri: "file://photo.jpg",
        doctorName: "Dr. Lee",
        condition: "Hypertension",
        tags: ["bp"],
        visitDate: "2025-02-01",
      },
      () => "2025-02-01T10:00:00.000Z"
    );

    await deletePrescription(driver, created.id);

    const prescriptions = await listPrescriptionsByPatient(driver, patient.id);
    expect(prescriptions).toHaveLength(0);
  });

  test("createPrescription propagates insert failures", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" });
    const runSpy = jest
      .spyOn(driver, "runAsync")
      .mockRejectedValueOnce(new Error("insert failed"));

    await expect(
      createPrescription(driver, {
        patientId: patient.id,
        photoUri: "file://photo.jpg",
        doctorName: "Dr. Lee",
        condition: "Hypertension",
        tags: ["bp"],
        visitDate: "2025-02-01",
      })
    ).rejects.toThrow("insert failed");

    expect(runSpy).toHaveBeenCalled();
  });

  test("updatePrescription propagates update failures", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" });
    const created = await createPrescription(driver, {
      patientId: patient.id,
      photoUri: "file://photo.jpg",
      doctorName: "Dr. Lee",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2025-02-01",
    });
    const runSpy = jest.spyOn(driver, "runAsync");
    runSpy.mockImplementation(async (sql, params) => {
      if (sql.startsWith("UPDATE prescriptions")) {
        throw new Error("update failed");
      }
      return FakeDriver.prototype.runAsync.call(driver, sql, params);
    });

    await expect(
      updatePrescription(driver, created.id, { condition: "Changed" })
    ).rejects.toThrow("update failed");
  });

  test("searchPrescriptions matches doctor, condition, and tags within patient scope", async () => {
    const driver = new FakeDriver();
    const patient = await createPatient(driver, { name: "Alex" });

    await createPrescription(driver, {
      patientId: patient.id,
      photoUri: "file://one.jpg",
      doctorName: "Dr. Alpha",
      condition: "Migraine",
      tags: ["night"],
      visitDate: "2025-02-01",
    });

    await createPrescription(driver, {
      patientId: patient.id,
      photoUri: "file://two.jpg",
      doctorName: "Dr. Beta",
      condition: "Asthma",
      tags: ["inhaler"],
      visitDate: "2025-02-02",
    });

    await createPrescription(driver, {
      patientId: patient.id,
      photoUri: "file://three.jpg",
      doctorName: "Dr. Gamma",
      condition: "Blood Pressure",
      tags: ["bp-monitor"],
      visitDate: "2025-02-03",
    });

    const doctorMatches = await searchPrescriptions(driver, {
      patientId: patient.id,
      query: "ALPH",
    });
    expect(doctorMatches).toHaveLength(1);
    expect(doctorMatches[0].doctorName).toBe("Dr. Alpha");

    const conditionMatches = await searchPrescriptions(driver, {
      patientId: patient.id,
      query: "asth",
    });
    expect(conditionMatches).toHaveLength(1);
    expect(conditionMatches[0].condition).toBe("Asthma");

    const tagMatches = await searchPrescriptions(driver, {
      patientId: patient.id,
      query: "bp-mon",
    });
    expect(tagMatches).toHaveLength(1);
    expect(tagMatches[0].doctorName).toBe("Dr. Gamma");
  });

  test("searchPrescriptions defaults to patient scope and supports all-patients toggle", async () => {
    const driver = new FakeDriver();
    const patientOne = await createPatient(driver, { name: "One" });
    const patientTwo = await createPatient(driver, { name: "Two" });

    await createPrescription(driver, {
      patientId: patientOne.id,
      photoUri: "file://one.jpg",
      doctorName: "Dr. Shared",
      condition: "Condition One",
      tags: ["scope-a"],
      visitDate: "2025-02-01",
    });
    await createPrescription(driver, {
      patientId: patientTwo.id,
      photoUri: "file://two.jpg",
      doctorName: "Dr. Shared",
      condition: "Condition Two",
      tags: ["scope-b"],
      visitDate: "2025-02-02",
    });

    const scopedResults = await searchPrescriptions(driver, {
      patientId: patientOne.id,
      query: "shared",
    });
    expect(scopedResults).toHaveLength(1);
    expect(scopedResults[0].patientId).toBe(patientOne.id);

    const globalResults = await searchPrescriptions(driver, {
      patientId: patientOne.id,
      query: "shared",
      searchAllPatients: true,
    });
    expect(globalResults).toHaveLength(2);
  });
});
