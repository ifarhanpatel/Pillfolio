import type { NewPatientInput, NewPrescriptionInput } from "../db/types";

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, ValidationErrorCode>;
};

export type ValidationErrorCode =
  | "validation.name_required"
  | "validation.gender_empty"
  | "validation.age_invalid"
  | "validation.doctor_name_required"
  | "validation.condition_required"
  | "validation.patient_required"
  | "validation.tags_required"
  | "validation.visit_date_required"
  | "validation.visit_date_out_of_range"
  | "validation.visit_date_future"
  | "validation.photo_required";

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
  message: ValidationErrorCode
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
    result = addError(result, "name", "validation.name_required");
  }

  if (hasGender && !gender) {
    result = addError(result, "gender", "validation.gender_empty");
  }

  if (hasAge && age !== null) {
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      result = addError(result, "age", "validation.age_invalid");
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
    result = addError(result, "doctorName", "validation.doctor_name_required");
  }

  if (!condition) {
    result = addError(result, "condition", "validation.condition_required");
  }

  if (!patientId) {
    result = addError(result, "patientId", "validation.patient_required");
  }

  if (!input.tags || input.tags.length === 0) {
    result = addError(result, "tags", "validation.tags_required");
  }

  if (!visitDate || Number.isNaN(Date.parse(visitDate))) {
    result = addError(result, "visitDate", "validation.visit_date_required");
  } else if (visitDate < PRESCRIPTION_VISIT_DATE_MIN || visitDate > PRESCRIPTION_VISIT_DATE_MAX) {
    result = addError(result, "visitDate", "validation.visit_date_out_of_range");
  } else if (visitDate > formatDateOnly(new Date())) {
    result = addError(result, "visitDate", "validation.visit_date_future");
  }

  return result;
};
