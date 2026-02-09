import type { SqlDriver } from "./driver";
import type { NewPatientInput, Patient, UpdatePatientInput } from "./types";
import { createId } from "../utils/id";

const mapPatientRow = (row: Patient): Patient => ({
  ...row,
  relationship: row.relationship ?? null,
});

export const createPatient = async (
  driver: SqlDriver,
  input: NewPatientInput,
  now: () => string = () => new Date().toISOString()
): Promise<Patient> => {
  const id = createId();
  const timestamp = now();
  const relationship = input.relationship ?? null;

  await driver.runAsync(
    "INSERT INTO patients (id, name, relationship, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?);",
    [id, input.name.trim(), relationship, timestamp, timestamp]
  );

  return {
    id,
    name: input.name.trim(),
    relationship,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
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
  const timestamp = now();
  const relationship = input.relationship ?? null;

  await driver.runAsync(
    "UPDATE patients SET name = ?, relationship = ?, updatedAt = ? WHERE id = ?;",
    [input.name.trim(), relationship, timestamp, id]
  );

  return getPatientById(driver, id);
};

export const deletePatient = async (
  driver: SqlDriver,
  id: string
): Promise<void> => {
  await driver.runAsync("DELETE FROM patients WHERE id = ?;", [id]);
};
