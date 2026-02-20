import type { SqlDriver } from "./driver";
import type {
  NewPatientInput,
  Patient,
  PatientListItem,
  UpdatePatientInput,
} from "./types";
import { createId } from "../utils/id";

type PatientRow = Omit<Patient, "isPrimary"> & {
  isPrimary: boolean | number | null;
};

const mapPatientRow = (row: PatientRow): Patient => ({
  id: row.id,
  name: row.name,
  relationship: row.relationship ?? null,
  gender: row.gender ?? null,
  isPrimary: Boolean(row.isPrimary),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapPatientListRow = (
  row: Omit<PatientListItem, "isPrimary"> & { isPrimary: boolean | number | null }
): PatientListItem => ({
  ...mapPatientRow(row),
  prescriptionsCount: Number(row.prescriptionsCount ?? 0),
});

const requirePatient = (patient: Patient | null, action: string): Patient => {
  if (!patient) {
    throw new Error(`Patient ${action} verification failed.`);
  }

  return patient;
};

export const createPatient = async (
  driver: SqlDriver,
  input: NewPatientInput,
  now: () => string = () => new Date().toISOString()
): Promise<Patient> => {
  const id = createId();
  const timestamp = now();
  const relationship = input.relationship ?? null;
  const gender = input.gender ?? null;
  const isPrimary = input.isPrimary ? 1 : 0;

  if (isPrimary) {
    await driver.runAsync("UPDATE patients SET isPrimary = 0 WHERE isPrimary = 1;");
  }

  await driver.runAsync(
    "INSERT INTO patients (id, name, relationship, gender, isPrimary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);",
    [id, input.name.trim(), relationship, gender, isPrimary, timestamp, timestamp]
  );

  return requirePatient(await getPatientById(driver, id), "insert");
};

export const getPatientById = async (
  driver: SqlDriver,
  id: string
): Promise<Patient | null> => {
  const row = await driver.getFirstAsync<PatientRow>(
    "SELECT * FROM patients WHERE id = ?;",
    [id]
  );

  return row ? mapPatientRow(row) : null;
};

export const listPatients = async (
  driver: SqlDriver
): Promise<PatientListItem[]> => {
  const rows = await driver.getAllAsync<PatientListItem & { isPrimary: boolean | number | null }>(
    `SELECT patients.*, COALESCE(COUNT(prescriptions.id), 0) AS prescriptionsCount
     FROM patients
     LEFT JOIN prescriptions ON prescriptions.patientId = patients.id
     GROUP BY patients.id
     ORDER BY patients.isPrimary DESC, patients.createdAt DESC;`
  );

  return rows.map(mapPatientListRow);
};

export const updatePatient = async (
  driver: SqlDriver,
  id: string,
  input: UpdatePatientInput,
  now: () => string = () => new Date().toISOString()
): Promise<Patient | null> => {
  const existing = await getPatientById(driver, id);
  if (!existing) {
    return null;
  }

  const timestamp = now();
  const hasRelationship = Object.prototype.hasOwnProperty.call(
    input,
    "relationship"
  );
  const hasGender = Object.prototype.hasOwnProperty.call(input, "gender");
  const hasIsPrimary = Object.prototype.hasOwnProperty.call(input, "isPrimary");
  const relationship = hasRelationship
    ? input.relationship ?? null
    : existing.relationship;
  const gender = hasGender ? input.gender ?? null : existing.gender;
  const isPrimary = hasIsPrimary ? Boolean(input.isPrimary) : existing.isPrimary;

  if (isPrimary) {
    await driver.runAsync(
      "UPDATE patients SET isPrimary = 0 WHERE id != ? AND isPrimary = 1;",
      [id]
    );
  }

  await driver.runAsync(
    "UPDATE patients SET name = ?, relationship = ?, gender = ?, isPrimary = ?, updatedAt = ? WHERE id = ?;",
    [input.name.trim(), relationship, gender, isPrimary ? 1 : 0, timestamp, id]
  );

  return requirePatient(await getPatientById(driver, id), "update");
};

export const deletePatient = async (
  driver: SqlDriver,
  id: string
): Promise<void> => {
  await driver.runAsync("DELETE FROM patients WHERE id = ?;", [id]);
};

export type DeletePatientStrategy =
  | { type: "delete-all" }
  | { type: "reassign"; targetPatientId: string };

export const deletePatientWithStrategy = async (
  driver: SqlDriver,
  id: string,
  strategy: DeletePatientStrategy
): Promise<void> => {
  const patient = await getPatientById(driver, id);
  if (!patient) {
    return;
  }

  if (strategy.type === "delete-all") {
    await deletePatient(driver, id);
    return;
  }

  if (!strategy.targetPatientId || strategy.targetPatientId === id) {
    throw new Error("A different target patient is required for reassignment.");
  }

  const targetPatient = await getPatientById(driver, strategy.targetPatientId);
  if (!targetPatient) {
    throw new Error("Target patient was not found.");
  }

  await driver.runAsync(
    "UPDATE prescriptions SET patientId = ? WHERE patientId = ?;",
    [strategy.targetPatientId, id]
  );
  await deletePatient(driver, id);
};
