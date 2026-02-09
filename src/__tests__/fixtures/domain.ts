import type { NewPatientInput, NewPrescriptionInput, Patient, Prescription } from "../../db/types";

export const FIXED_DATES = {
  createdAt: "2025-01-15T09:30:00.000Z",
  updatedAt: "2025-01-15T09:30:00.000Z",
  visitDate: "2025-02-01",
} as const;

export const DEFAULT_TAGS = ["blood-pressure", "morning"] as const;

export const patientFixture = (
  overrides: Partial<Patient> = {}
): Patient => ({
  id: "patient-1",
  name: "Alex Doe",
  relationship: "Self",
  gender: "female",
  createdAt: FIXED_DATES.createdAt,
  updatedAt: FIXED_DATES.updatedAt,
  ...overrides,
});

export const newPatientInputFixture = (
  overrides: Partial<NewPatientInput> = {}
): NewPatientInput => ({
  name: "Alex Doe",
  relationship: "Self",
  gender: "female",
  ...overrides,
});

export const prescriptionFixture = (
  overrides: Partial<Prescription> = {}
): Prescription => ({
  id: "prescription-1",
  patientId: "patient-1",
  photoUri: "file://stored/prescription-1.jpg",
  doctorName: "Dr. Patel",
  doctorSpecialty: "Internal Medicine",
  condition: "Hypertension",
  tags: [...DEFAULT_TAGS],
  visitDate: FIXED_DATES.visitDate,
  notes: "Take after breakfast.",
  createdAt: FIXED_DATES.createdAt,
  updatedAt: FIXED_DATES.updatedAt,
  ...overrides,
});

export const newPrescriptionInputFixture = (
  overrides: Partial<NewPrescriptionInput> = {}
): NewPrescriptionInput => ({
  patientId: "patient-1",
  photoUri: "file://incoming/photo.jpg",
  doctorName: "Dr. Patel",
  doctorSpecialty: "Internal Medicine",
  condition: "Hypertension",
  tags: [...DEFAULT_TAGS],
  visitDate: FIXED_DATES.visitDate,
  notes: "Take after breakfast.",
  ...overrides,
});
