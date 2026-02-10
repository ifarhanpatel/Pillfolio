import { type AddPrescriptionDraft } from "../../services";
import {
  addPrescription,
  deletePrescriptionWithCleanup,
  editPrescription,
  ensureDefaultPatient,
  parseTagInput,
  pickPrescriptionPhoto,
} from "../../services";
import { FakeDriver } from "../helpers/fakeDriver";
import { createTestBoundaries } from "../helpers/mockBoundaries";

const createDraft = (overrides: Partial<AddPrescriptionDraft> = {}): AddPrescriptionDraft => ({
  patientId: "patient-1",
  photoUri: "file://picked/image.jpg",
  doctorName: "Dr. Lee",
  doctorSpecialty: "Cardiology",
  condition: "Hypertension",
  tags: ["bp"],
  visitDate: "2025-02-01",
  notes: "Take after breakfast.",
  ...overrides,
});

describe("prescriptionFlow", () => {
  test("parseTagInput trims, removes blanks, and deduplicates tags", () => {
    expect(parseTagInput(" bp, daily, , BP, evening ")).toEqual([
      "bp",
      "daily",
      "evening",
    ]);
  });

  test("pickPrescriptionPhoto returns selected uri or null", async () => {
    const { boundaries, mocks } = createTestBoundaries();

    await expect(pickPrescriptionPhoto(boundaries, "camera")).resolves.toBe(
      "file://picked/image.jpg"
    );

    mocks.imagePicker.nextResult = null;

    await expect(pickPrescriptionPhoto(boundaries, "library")).resolves.toBeNull();
    expect(mocks.imagePicker.picks).toEqual(["camera", "library"]);
  });

  test("addPrescription blocks save when required data is missing", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const driver = mocks.db.driver as FakeDriver;
    const patientId = await ensureDefaultPatient(boundaries);

    const result = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: " ",
        doctorName: " ",
        condition: " ",
        tags: [],
        visitDate: "",
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        photoUri: "Photo is required.",
        doctorName: "Doctor name is required.",
        condition: "Condition is required.",
        tags: "At least one tag is required.",
        visitDate: "Visit date is required.",
      });
    }

    expect(mocks.imageCompression.compressedImages).toEqual([]);
    expect(mocks.fileStorage.savedImages).toEqual([]);
    expect(driver.prescriptions).toHaveLength(0);
  });

  test("addPrescription compresses image, saves file, and persists row", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const driver = mocks.db.driver as FakeDriver;
    const patientId = await ensureDefaultPatient(boundaries);
    const picked = await pickPrescriptionPhoto(boundaries, "library");

    const result = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: picked ?? "",
        tags: ["bp", "daily"],
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prescription.patientId).toBe(patientId);
      expect(result.prescription.photoUri.startsWith("file://mock-storage/prescription-")).toBe(
        true
      );
      expect(result.prescription.tags).toEqual(["bp", "daily"]);
    }

    expect(mocks.imageCompression.compressedImages).toEqual(["file://picked/image.jpg"]);
    expect(mocks.fileStorage.savedImages).toHaveLength(1);
    expect(mocks.fileStorage.savedImages[0].sourceUri).toBe(
      "file://picked/image.jpg.compressed"
    );
    expect(driver.prescriptions).toHaveLength(1);
  });

  test("addPrescription cleans up stored file if db persistence fails", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const patientId = await ensureDefaultPatient(boundaries);
    const runSpy = jest.spyOn(mocks.db.driver, "runAsync");
    runSpy.mockImplementation(async (sql, params) => {
      if (sql.startsWith("INSERT INTO prescriptions")) {
        throw new Error("db insert failed");
      }
      return FakeDriver.prototype.runAsync.call(mocks.db.driver as FakeDriver, sql, params);
    });

    await expect(
      addPrescription(
        boundaries,
        createDraft({
          patientId,
          photoUri: "file://picked/image.jpg",
          tags: ["bp"],
        })
      )
    ).rejects.toThrow("db insert failed");

    expect(mocks.fileStorage.savedImages).toHaveLength(1);
    expect(mocks.fileStorage.deletedFiles).toHaveLength(1);
    expect(mocks.fileStorage.deletedFiles[0]).toContain("file://mock-storage/prescription-");
  });

  test("editPrescription updates record and updatedAt without replacing unchanged photo", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const patientId = await ensureDefaultPatient(boundaries);
    const created = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: "file://picked/image.jpg",
        condition: "Hypertension",
      })
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error("Expected a created prescription");
    }

    const originalPhoto = created.prescription.photoUri;
    const originalUpdatedAt = created.prescription.updatedAt;

    const result = await editPrescription(boundaries, {
      prescriptionId: created.prescription.id,
      patientId,
      photoUri: originalPhoto,
      doctorName: "Dr. Updated",
      doctorSpecialty: "Cardiology",
      condition: "Controlled Hypertension",
      tags: ["bp", "night"],
      visitDate: "2025-02-03",
      notes: "Updated note",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prescription.photoUri).toBe(originalPhoto);
      expect(result.prescription.updatedAt).toBe("2025-02-01T10:00:00.000Z");
      expect(result.prescription.updatedAt).not.toBe(originalUpdatedAt);
      expect(result.prescription.doctorName).toBe("Dr. Updated");
      expect(result.prescription.condition).toBe("Controlled Hypertension");
      expect(result.prescription.tags).toEqual(["bp", "night"]);
    }

    expect(mocks.imageCompression.compressedImages).toEqual(["file://picked/image.jpg"]);
    expect(mocks.fileStorage.savedImages).toHaveLength(1);
    expect(mocks.fileStorage.deletedFiles).toHaveLength(0);
  });

  test("editPrescription replaces photo and deletes previous stored file", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const patientId = await ensureDefaultPatient(boundaries);
    const created = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: "file://picked/image.jpg",
      })
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error("Expected a created prescription");
    }

    const previousPhotoUri = created.prescription.photoUri;
    const result = await editPrescription(boundaries, {
      prescriptionId: created.prescription.id,
      patientId,
      photoUri: "file://picked/new-image.jpg",
      doctorName: "Dr. Lee",
      doctorSpecialty: "Cardiology",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2025-02-01",
      notes: "Take after breakfast.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prescription.photoUri).not.toBe(previousPhotoUri);
      expect(result.prescription.photoUri.startsWith("file://mock-storage/prescription-")).toBe(true);
    }

    expect(mocks.imageCompression.compressedImages).toEqual([
      "file://picked/image.jpg",
      "file://picked/new-image.jpg",
    ]);
    expect(mocks.fileStorage.savedImages).toHaveLength(2);
    expect(mocks.fileStorage.deletedFiles).toContain(previousPhotoUri);
  });

  test("editPrescription cleans up newly stored file if db update fails", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const patientId = await ensureDefaultPatient(boundaries);
    const created = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: "file://picked/image.jpg",
      })
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error("Expected a created prescription");
    }

    const runSpy = jest.spyOn(mocks.db.driver, "runAsync");
    runSpy.mockImplementation(async (sql, params) => {
      if (sql.startsWith("UPDATE prescriptions")) {
        throw new Error("db update failed");
      }
      return FakeDriver.prototype.runAsync.call(mocks.db.driver as FakeDriver, sql, params);
    });

    await expect(
      editPrescription(boundaries, {
        prescriptionId: created.prescription.id,
        patientId,
        photoUri: "file://picked/new-image.jpg",
        doctorName: "Dr. Updated",
        doctorSpecialty: "Cardiology",
        condition: "Hypertension",
        tags: ["bp"],
        visitDate: "2025-02-01",
        notes: "Updated notes",
      })
    ).rejects.toThrow("db update failed");

    expect(mocks.fileStorage.savedImages).toHaveLength(2);
    expect(mocks.fileStorage.deletedFiles).toHaveLength(1);
    expect(mocks.fileStorage.deletedFiles[0].startsWith("file://mock-storage/prescription-")).toBe(
      true
    );
  });

  test("deletePrescriptionWithCleanup deletes db row and image file", async () => {
    const { boundaries, mocks } = createTestBoundaries();
    const driver = mocks.db.driver as FakeDriver;
    const patientId = await ensureDefaultPatient(boundaries);
    const created = await addPrescription(
      boundaries,
      createDraft({
        patientId,
        photoUri: "file://picked/image.jpg",
      })
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error("Expected a created prescription");
    }

    const deleted = await deletePrescriptionWithCleanup(boundaries, created.prescription.id);

    expect(deleted).toBe(true);
    expect(driver.prescriptions).toHaveLength(0);
    expect(mocks.fileStorage.deletedFiles).toContain(created.prescription.photoUri);
  });

  test("deletePrescriptionWithCleanup returns false for missing record", async () => {
    const { boundaries, mocks } = createTestBoundaries();

    const deleted = await deletePrescriptionWithCleanup(boundaries, "missing-id");

    expect(deleted).toBe(false);
    expect(mocks.fileStorage.deletedFiles).toEqual([]);
  });
});
