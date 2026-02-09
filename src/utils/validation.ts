import type { NewPatientInput, NewPrescriptionInput } from "../db/types";

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

const emptyResult = (): ValidationResult => ({ valid: true, errors: {} });

const addError = (
  result: ValidationResult,
  field: string,
  message: string
): ValidationResult => {
  return {
    valid: false,
    errors: {
      ...result.errors,
      [field]: message,
    },
  };
};

export const validatePatientInput = (input: NewPatientInput): ValidationResult => {
  let result = emptyResult();
  const name = input.name?.trim();
  const hasGender = Object.prototype.hasOwnProperty.call(input, "gender");
  const gender = input.gender?.trim();

  if (!name) {
    result = addError(result, "name", "Name is required.");
  }

  if (hasGender && !gender) {
    result = addError(result, "gender", "Gender cannot be empty.");
  }

  return result;
};

export const validatePrescriptionInput = (
  input: Pick<
    NewPrescriptionInput,
    "doctorName" | "condition" | "tags" | "visitDate" | "patientId"
  >
): ValidationResult => {
  let result = emptyResult();
  const doctorName = input.doctorName?.trim();
  const condition = input.condition?.trim();
  const patientId = input.patientId?.trim();

  if (!doctorName) {
    result = addError(result, "doctorName", "Doctor name is required.");
  }

  if (!condition) {
    result = addError(result, "condition", "Condition is required.");
  }

  if (!patientId) {
    result = addError(result, "patientId", "Patient is required.");
  }

  if (!input.tags || input.tags.length === 0) {
    result = addError(result, "tags", "At least one tag is required.");
  }

  if (!input.visitDate || Number.isNaN(Date.parse(input.visitDate))) {
    result = addError(result, "visitDate", "Visit date is required.");
  }

  return result;
};
