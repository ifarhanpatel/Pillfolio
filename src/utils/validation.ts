import type { NewPatientInput, NewPrescriptionInput } from "../db/types";

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

const emptyResult = (): ValidationResult => ({ valid: true, errors: {} });
const PRESCRIPTION_VISIT_DATE_MIN = "2026-01-01";
const PRESCRIPTION_VISIT_DATE_MAX = "2026-12-31";
const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const hasAge = Object.prototype.hasOwnProperty.call(input, "age");
  const age = hasAge ? (input.age ?? null) : null;

  if (!name) {
    result = addError(result, "name", "Name is required.");
  }

  if (hasGender && !gender) {
    result = addError(result, "gender", "Gender cannot be empty.");
  }

  if (hasAge && age !== null) {
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      result = addError(result, "age", "Age must be a whole number between 0 and 120.");
    }
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
  const visitDate = input.visitDate?.trim();

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

  if (!visitDate || Number.isNaN(Date.parse(visitDate))) {
    result = addError(result, "visitDate", "Visit date is required.");
  } else if (visitDate < PRESCRIPTION_VISIT_DATE_MIN || visitDate > PRESCRIPTION_VISIT_DATE_MAX) {
    result = addError(result, "visitDate", "Visit date must be within 2026.");
  } else if (visitDate > formatDateOnly(new Date())) {
    result = addError(result, "visitDate", "Visit date cannot be in the future.");
  }

  return result;
};
