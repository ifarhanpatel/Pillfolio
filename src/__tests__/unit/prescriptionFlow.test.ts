import { type AddPrescriptionDraft } from "../../services";
import {
  addPrescription,
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
});
