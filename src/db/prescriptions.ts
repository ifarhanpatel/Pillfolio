import type { SqlDriver } from "./driver";
import type {
  NewPrescriptionInput,
  Prescription,
  UpdatePrescriptionInput,
} from "./types";
import { createId } from "../utils/id";

const mapPrescriptionRow = (row: Prescription & { tagsJson?: string }): Prescription => {
  const tags = row.tagsJson ? (JSON.parse(row.tagsJson) as string[]) : row.tags;

  return {
    id: row.id,
    patientId: row.patientId,
    photoUri: row.photoUri,
    doctorName: row.doctorName,
    doctorSpecialty: row.doctorSpecialty ?? null,
    condition: row.condition,
    tags,
    visitDate: row.visitDate,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const requirePrescription = (
  prescription: Prescription | null,
  action: string
): Prescription => {
  if (!prescription) {
    throw new Error(`Prescription ${action} verification failed.`);
  }

  return prescription;
};

export const createPrescription = async (
  driver: SqlDriver,
  input: NewPrescriptionInput,
  now: () => string = () => new Date().toISOString()
): Promise<Prescription> => {
  const id = createId();
  const timestamp = now();
  const doctorSpecialty = input.doctorSpecialty ?? null;
  const notes = input.notes ?? null;
  const tagsJson = JSON.stringify(input.tags);

  await driver.runAsync(
    "INSERT INTO prescriptions (id, patientId, photoUri, doctorName, doctorSpecialty, condition, tagsJson, visitDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
    [
      id,
      input.patientId,
      input.photoUri,
      input.doctorName.trim(),
      doctorSpecialty,
      input.condition.trim(),
      tagsJson,
      input.visitDate,
      notes,
      timestamp,
      timestamp,
    ]
  );

  return requirePrescription(
    await getPrescriptionById(driver, id),
    "insert"
  );
};

export const getPrescriptionById = async (
  driver: SqlDriver,
  id: string
): Promise<Prescription | null> => {
  const row = await driver.getFirstAsync<Prescription & { tagsJson: string }>(
    "SELECT * FROM prescriptions WHERE id = ?;",
    [id]
  );

  return row ? mapPrescriptionRow(row) : null;
};

export const listPrescriptionsByPatient = async (
  driver: SqlDriver,
  patientId: string
): Promise<Prescription[]> => {
  const rows = await driver.getAllAsync<Prescription & { tagsJson: string }>(
    "SELECT * FROM prescriptions WHERE patientId = ? ORDER BY visitDate DESC;",
    [patientId]
  );

  return rows.map(mapPrescriptionRow);
};

export const updatePrescription = async (
  driver: SqlDriver,
  id: string,
  input: UpdatePrescriptionInput,
  now: () => string = () => new Date().toISOString()
): Promise<Prescription | null> => {
  const existing = await getPrescriptionById(driver, id);

  if (!existing) {
    return null;
  }

  const updated: Prescription = {
    ...existing,
    ...input,
    doctorSpecialty: input.doctorSpecialty ?? existing.doctorSpecialty,
    notes: input.notes ?? existing.notes,
    tags: input.tags ?? existing.tags,
    updatedAt: now(),
  };

  await driver.runAsync(
    "UPDATE prescriptions SET photoUri = ?, doctorName = ?, doctorSpecialty = ?, condition = ?, tagsJson = ?, visitDate = ?, notes = ?, updatedAt = ? WHERE id = ?;",
    [
      updated.photoUri,
      updated.doctorName.trim(),
      updated.doctorSpecialty,
      updated.condition.trim(),
      JSON.stringify(updated.tags),
      updated.visitDate,
      updated.notes,
      updated.updatedAt,
      id,
    ]
  );

  return requirePrescription(await getPrescriptionById(driver, id), "update");
};

export const deletePrescription = async (
  driver: SqlDriver,
  id: string
): Promise<void> => {
  await driver.runAsync("DELETE FROM prescriptions WHERE id = ?;", [id]);
};
