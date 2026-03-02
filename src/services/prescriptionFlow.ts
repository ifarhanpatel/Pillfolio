import { createPatient, listPatients } from "../db/patients";
import {
  createPrescription,
  deletePrescription,
  getPrescriptionById,
  updatePrescription,
} from "../db/prescriptions";
import type { Prescription } from "../db/types";
import { DEFAULT_PATIENT_NAME } from "../constants/app";
import { createId } from "../utils/id";
import { validatePrescriptionInput } from "../utils/validation";
import {
  addSentryBreadcrumb,
  captureSentryException,
  withSentrySpan,
} from "./sentry";
import type { AppBoundaries, ImageSource } from "./boundaries";

const normalizeOptional = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveStoredImageExtension = (uri: string): string => {
  const normalized = uri.split("?")[0]?.split("#")[0] ?? uri;
  const match = normalized.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();

  if (!extension) {
    return "jpg";
  }

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension;
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

export type EditPrescriptionDraft = AddPrescriptionDraft & {
  prescriptionId: string;
};

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
    errors.photoUri = "validation.photo_required";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return null;
};

const toCreatePayload = (draft: AddPrescriptionDraft, photoUri: string) => ({
  patientId: draft.patientId.trim(),
  photoUri,
  doctorName: draft.doctorName.trim(),
  doctorSpecialty: normalizeOptional(draft.doctorSpecialty),
  condition: draft.condition.trim(),
  tags: draft.tags,
  visitDate: draft.visitDate,
  notes: normalizeOptional(draft.notes),
});

const toEditPayload = (draft: AddPrescriptionDraft, photoUri: string) => ({
  photoUri,
  doctorName: draft.doctorName.trim(),
  doctorSpecialty: normalizeOptional(draft.doctorSpecialty),
  condition: draft.condition.trim(),
  tags: draft.tags,
  visitDate: draft.visitDate,
  notes: normalizeOptional(draft.notes),
});

const toSentryDraftData = (draft: AddPrescriptionDraft) => ({
  has_photo: Boolean(draft.photoUri.trim()),
  tags_count: draft.tags.length,
  has_doctor_specialty: Boolean(draft.doctorSpecialty.trim()),
  has_notes: Boolean(draft.notes.trim()),
  visit_date_present: Boolean(draft.visitDate.trim()),
});

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
    isPrimary: true,
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
  const sentryDraftData = toSentryDraftData(draft);
  addSentryBreadcrumb({
    category: "prescription",
    message: "addPrescription:start",
    data: sentryDraftData,
  });

  const validationError = validateDraft(draft);
  if (validationError) {
    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:validation_failed",
      level: "warning",
      data: {
        ...sentryDraftData,
        result: "validation_failed",
      },
    });
    return validationError;
  }

  let stage = "open_db";
  let storedUri: string | null = null;

  try {
    const driver = await boundaries.db.open();
    stage = "initialize_db";
    await boundaries.db.initialize(driver);

    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:image_compress_started",
      data: sentryDraftData,
    });
    stage = "compress_image";
    const compressedUri = await withSentrySpan("compress-image", "file", async () => {
      return boundaries.imageCompression.compressImage(draft.photoUri.trim());
    }, {
      has_photo: sentryDraftData.has_photo,
    });

    stage = "save_image";
    storedUri = await withSentrySpan("save-image", "file", async () => {
      return boundaries.fileStorage.saveImage(
        compressedUri,
        `prescription-${createId()}.${resolveStoredImageExtension(compressedUri)}`
      );
    }, {
      has_photo: sentryDraftData.has_photo,
    });
    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:image_saved",
      data: sentryDraftData,
    });

    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:db_write_started",
      data: sentryDraftData,
    });
    stage = "create_prescription";
    const finalStoredUri = storedUri;
    if (!finalStoredUri) {
      throw new Error("Prescription image was not stored.");
    }
    const created = await withSentrySpan("create-prescription", "prescription", async () => {
      return createPrescription(driver, {
        ...toCreatePayload(draft, finalStoredUri),
      });
    }, {
      tags_count: sentryDraftData.tags_count,
      has_notes: sentryDraftData.has_notes,
    });

    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:success",
      data: {
        ...sentryDraftData,
        result: "success",
      },
    });
    return {
      ok: true,
      prescription: created,
    };
  } catch (error) {
    addSentryBreadcrumb({
      category: "prescription",
      message: "addPrescription:db_failure",
      level: "error",
      data: {
        ...sentryDraftData,
        result: "error",
      },
    });
    if (storedUri) {
      await boundaries.fileStorage.deleteFile(storedUri).catch(() => undefined);
    }
    captureSentryException(error, {
      area: "prescription",
      action: stage,
      data: sentryDraftData,
    });
    throw error;
  }
};

export const editPrescription = async (
  boundaries: AppBoundaries,
  draft: EditPrescriptionDraft
): Promise<AddPrescriptionResult> => {
  const sentryDraftData = toSentryDraftData(draft);
  addSentryBreadcrumb({
    category: "prescription",
    message: "editPrescription:start",
    data: sentryDraftData,
  });

  const validationError = validateDraft(draft);
  if (validationError) {
    return validationError;
  }

  let stage = "open_db";
  let nextStoredPhotoUri: string | null = null;
  let didCreateReplacementImage = false;

  try {
    const driver = await boundaries.db.open();
    stage = "initialize_db";
    await boundaries.db.initialize(driver);

    stage = "load_existing";
    const existing = await getPrescriptionById(driver, draft.prescriptionId.trim());
    if (!existing) {
      return {
        ok: false,
        errors: {
          prescriptionId: "prescriptionForm.notFound",
        },
      };
    }

    const nextPhotoUriRaw = draft.photoUri.trim();
    const isPhotoChanged = nextPhotoUriRaw !== existing.photoUri;
    let previousPhotoToDelete: string | null = null;
    nextStoredPhotoUri = existing.photoUri;

    if (isPhotoChanged) {
      addSentryBreadcrumb({
        category: "prescription",
        message: "editPrescription:photo_changed",
        data: {
          ...sentryDraftData,
          photo_changed: true,
        },
      });
      stage = "compress_image";
      const compressedUri = await withSentrySpan("compress-image", "file", async () => {
        return boundaries.imageCompression.compressImage(nextPhotoUriRaw);
      }, {
        photo_changed: true,
      });

      stage = "save_image";
      nextStoredPhotoUri = await withSentrySpan("save-image", "file", async () => {
        return boundaries.fileStorage.saveImage(
          compressedUri,
          `prescription-${createId()}.${resolveStoredImageExtension(compressedUri)}`
        );
      }, {
        photo_changed: true,
      });
      didCreateReplacementImage = true;
      previousPhotoToDelete = existing.photoUri;
    }

    stage = "update_prescription";
    const updated = await withSentrySpan("update-prescription", "prescription", async () => {
      return updatePrescription(
        driver,
        existing.id,
        toEditPayload(draft, nextStoredPhotoUri ?? existing.photoUri),
        () => boundaries.clock.nowIso()
      );
    }, {
      photo_changed: didCreateReplacementImage,
      tags_count: sentryDraftData.tags_count,
    });

    if (!updated) {
      if (didCreateReplacementImage && nextStoredPhotoUri) {
        await boundaries.fileStorage.deleteFile(nextStoredPhotoUri).catch(() => undefined);
      }

      return {
        ok: false,
        errors: {
          prescriptionId: "prescriptionForm.notFound",
        },
      };
    }

    if (previousPhotoToDelete) {
      await boundaries.fileStorage.deleteFile(previousPhotoToDelete).catch(() => undefined);
    }

    addSentryBreadcrumb({
      category: "prescription",
      message: "editPrescription:success",
      data: {
        ...sentryDraftData,
        photo_changed: didCreateReplacementImage,
        result: "success",
      },
    });
    return {
      ok: true,
      prescription: updated,
    };
  } catch (error) {
    if (didCreateReplacementImage && nextStoredPhotoUri) {
      await boundaries.fileStorage.deleteFile(nextStoredPhotoUri).catch(() => undefined);
    }
    captureSentryException(error, {
      area: "prescription",
      action: stage,
      data: {
        ...sentryDraftData,
        photo_changed: didCreateReplacementImage,
      },
    });
    throw error;
  }
};

export const deletePrescriptionWithCleanup = async (
  boundaries: AppBoundaries,
  prescriptionId: string
): Promise<boolean> => {
  addSentryBreadcrumb({
    category: "prescription",
    message: "deletePrescription:start",
  });

  let stage = "open_db";

  try {
    const driver = await boundaries.db.open();
    stage = "initialize_db";
    await boundaries.db.initialize(driver);

    stage = "load_existing";
    const existing = await getPrescriptionById(driver, prescriptionId);
    if (!existing) {
      return false;
    }

    stage = "delete_prescription";
    await withSentrySpan("delete-prescription", "prescription", async () => {
      await deletePrescription(driver, prescriptionId);
    });
    stage = "delete_image";
    await boundaries.fileStorage.deleteFile(existing.photoUri);

    addSentryBreadcrumb({
      category: "prescription",
      message: "deletePrescription:success",
      data: {
        result: "success",
      },
    });
    return true;
  } catch (error) {
    captureSentryException(error, {
      area: "prescription",
      action: stage,
    });
    throw error;
  }
};
