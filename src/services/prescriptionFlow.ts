import { createPatient, listPatients } from "../db/patients";
import { createPrescription } from "../db/prescriptions";
import type { Prescription } from "../db/types";
import { DEFAULT_PATIENT_NAME } from "../constants/app";
import { createId } from "../utils/id";
import { validatePrescriptionInput } from "../utils/validation";
import type { AppBoundaries, ImageSource } from "./boundaries";

const normalizeOptional = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type AddPrescriptionDraft = {
  patientId: string;
  photoUri: string;
  doctorName: string;
  doctorSpecialty: string;
  condition: string;
  tags: string[];
  visitDate: string;
  notes: string;
};

export type AddPrescriptionFailure = {
  ok: false;
  errors: Record<string, string>;
};

export type AddPrescriptionSuccess = {
  ok: true;
  prescription: Prescription;
};

export type AddPrescriptionResult = AddPrescriptionFailure | AddPrescriptionSuccess;

export const parseTagInput = (rawTags: string): string[] => {
  const seen = new Set<string>();
  const parsed: string[] = [];

  for (const rawPart of rawTags.split(",")) {
    const tag = rawPart.trim();
    const normalized = tag.toLowerCase();

    if (!tag || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    parsed.push(tag);
  }

  return parsed;
};

const validateDraft = (draft: AddPrescriptionDraft): AddPrescriptionFailure | null => {
  const result = validatePrescriptionInput({
    patientId: draft.patientId,
    doctorName: draft.doctorName,
    condition: draft.condition,
    tags: draft.tags,
    visitDate: draft.visitDate,
  });

  const errors = { ...result.errors };
  if (!draft.photoUri.trim()) {
    errors.photoUri = "Photo is required.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return null;
};

export const ensureDefaultPatient = async (boundaries: AppBoundaries): Promise<string> => {
  const driver = await boundaries.db.open();
  await boundaries.db.initialize(driver);

  const existing = await listPatients(driver);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const patient = await createPatient(driver, {
    name: DEFAULT_PATIENT_NAME,
    relationship: "Self",
  });

  return patient.id;
};

export const pickPrescriptionPhoto = async (
  boundaries: AppBoundaries,
  source: ImageSource
): Promise<string | null> => {
  const picked = await boundaries.imagePicker.pickImage(source);
  return picked?.uri ?? null;
};

export const addPrescription = async (
  boundaries: AppBoundaries,
  draft: AddPrescriptionDraft
): Promise<AddPrescriptionResult> => {
  const validationError = validateDraft(draft);
  if (validationError) {
    return validationError;
  }

  const driver = await boundaries.db.open();
  await boundaries.db.initialize(driver);

  const compressedUri = await boundaries.imageCompression.compressImage(
    draft.photoUri.trim()
  );
  const storedUri = await boundaries.fileStorage.saveImage(
    compressedUri,
    `prescription-${createId()}.jpg`
  );

  try {
    const created = await createPrescription(driver, {
      patientId: draft.patientId.trim(),
      photoUri: storedUri,
      doctorName: draft.doctorName.trim(),
      doctorSpecialty: normalizeOptional(draft.doctorSpecialty),
      condition: draft.condition.trim(),
      tags: draft.tags,
      visitDate: draft.visitDate,
      notes: normalizeOptional(draft.notes),
    });

    return {
      ok: true,
      prescription: created,
    };
  } catch (error) {
    await boundaries.fileStorage.deleteFile(storedUri).catch(() => undefined);
    throw error;
  }
};
