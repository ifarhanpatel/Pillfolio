import { validatePatientInput, validatePrescriptionInput } from "../../utils/validation";

describe("validation", () => {
  test("validatePatientInput requires name", () => {
    const result = validatePatientInput({ name: " " });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("Name is required.");
  });

  test("validatePatientInput accepts name", () => {
    const result = validatePatientInput({ name: "Alex" });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("validatePatientInput rejects empty gender when provided", () => {
    const result = validatePatientInput({ name: "Alex", gender: " " });

    expect(result.valid).toBe(false);
    expect(result.errors.gender).toBe("Gender cannot be empty.");
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
      doctorName: "Doctor name is required.",
      condition: "Condition is required.",
      tags: "At least one tag is required.",
      visitDate: "Visit date is required.",
      patientId: "Patient is required.",
    });
  });

  test("validatePrescriptionInput accepts valid data", () => {
    const result = validatePrescriptionInput({
      doctorName: "Dr. Lee",
      condition: "Hypertension",
      tags: ["bp"],
      visitDate: "2025-01-20",
      patientId: "patient-1",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
