import { validatePatientInput, validatePrescriptionInput } from "../../utils/validation";

describe("validation", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-23T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("validatePatientInput requires name", () => {
    const result = validatePatientInput({ name: " " });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("validation.name_required");
  });

  test("validatePatientInput accepts name", () => {
    const result = validatePatientInput({ name: "Alex" });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("validatePatientInput rejects empty gender when provided", () => {
    const result = validatePatientInput({ name: "Alex", gender: " " });

    expect(result.valid).toBe(false);
    expect(result.errors.gender).toBe("validation.gender_empty");
  });

  test("validatePatientInput rejects invalid age", () => {
    const result = validatePatientInput({ name: "Alex", age: 121 });

    expect(result.valid).toBe(false);
    expect(result.errors.age).toBe("validation.age_invalid");
  });

  test("validatePatientInput accepts valid age", () => {
    const result = validatePatientInput({ name: "Alex", age: 45 });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("validatePrescriptionInput checks required fields", () => {
    const result = validatePrescriptionInput({
      doctorName: " ",
      condition: " ",
      tags: [],
      visitDate: "",
      patientId: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      doctorName: "validation.doctor_name_required",
      condition: "validation.condition_required",
      tags: "validation.tags_required",
      visitDate: "validation.visit_date_required",
      patientId: "validation.patient_required",
    });
  });

  test("validatePrescriptionInput accepts valid data", () => {
    const result = validatePrescriptionInput({
      doctorName: "Dr. Lee",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2026-01-20",
      patientId: "patient-1",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("validatePrescriptionInput rejects visit date outside 2026", () => {
    const result = validatePrescriptionInput({
      doctorName: "Dr. Lee",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2025-12-31",
      patientId: "patient-1",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.visitDate).toBe("validation.visit_date_out_of_range");
  });

  test("validatePrescriptionInput rejects future visit date", () => {
    const result = validatePrescriptionInput({
      doctorName: "Dr. Lee",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2026-12-31",
      patientId: "patient-1",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.visitDate).toBe("validation.visit_date_future");
  });
});
