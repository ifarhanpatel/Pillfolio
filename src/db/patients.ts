import type { SqlDriver } from "./driver";
import type { NewPatientInput, Patient, UpdatePatientInput } from "./types";
import { createId } from "../utils/id";

const mapPatientRow = (row: Patient): Patient => ({
  ...row,
  relationship: row.relationship ?? null,
  gender: row.gender ?? null,
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

  await driver.runAsync(
    "INSERT INTO patients (id, name, relationship, gender, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?);",
    [id, input.name.trim(), relationship, gender, timestamp, timestamp]
  );

  return requirePatient(await getPatientById(driver, id), "insert");
};

export const getPatientById = async (
  driver: SqlDriver,
  id: string
): Promise<Patient | null> => {
  const row = await driver.getFirstAsync<Patient>(
    "SELECT * FROM patients WHERE id = ?;",
    [id]
  );

  return row ? mapPatientRow(row) : null;
};

export const listPatients = async (driver: SqlDriver): Promise<Patient[]> => {
  const rows = await driver.getAllAsync<Patient>(
    "SELECT * FROM patients ORDER BY createdAt DESC;"
  );

  return rows.map(mapPatientRow);
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
  const relationship = hasRelationship
    ? input.relationship ?? null
    : existing.relationship;
  const gender = hasGender ? input.gender ?? null : existing.gender;

  await driver.runAsync(
    "UPDATE patients SET name = ?, relationship = ?, gender = ?, updatedAt = ? WHERE id = ?;",
    [input.name.trim(), relationship, gender, timestamp, id]
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
