import type { SqlDriver, SqlParams } from "../../db/driver";
import type { Patient, Prescription } from "../../db/types";

const asString = (value: unknown): string => String(value ?? "");

export class FakeDriver implements SqlDriver {
  public patients: Patient[] = [];
  public prescriptions: (Prescription & { tagsJson?: string })[] = [];
  public migrations: { id: string; appliedAt: string }[] = [];
  public executed: string[] = [];

  async execBatchAsync(statements: string[]): Promise<void> {
    for (const statement of statements) {
      await this.runAsync(statement, []);
    }
  }

  async runAsync(sql: string, params: SqlParams = []): Promise<void> {
    this.executed.push(sql);

    if (sql.startsWith("INSERT INTO patients")) {
      const [id, name, relationship, gender, createdAt, updatedAt] = params;
      this.patients.push({
        id: asString(id),
        name: asString(name),
        relationship: (relationship as string | null) ?? null,
        gender: (gender as string | null) ?? null,
        createdAt: asString(createdAt),
        updatedAt: asString(updatedAt),
      });
      return;
    }

    if (sql.startsWith("UPDATE patients")) {
      const [name, relationship, gender, updatedAt, id] = params;
      const patient = this.patients.find((row) => row.id === id);
      if (patient) {
        patient.name = asString(name);
        patient.relationship = (relationship as string | null) ?? null;
        patient.gender = (gender as string | null) ?? null;
        patient.updatedAt = asString(updatedAt);
      }
      return;
    }

    if (sql.startsWith("DELETE FROM patients")) {
      const [id] = params;
      this.patients = this.patients.filter((row) => row.id !== id);
      this.prescriptions = this.prescriptions.filter(
        (row) => row.patientId !== id
      );
      return;
    }

    if (sql.startsWith("INSERT INTO prescriptions")) {
      const [
        id,
        patientId,
        photoUri,
        doctorName,
        doctorSpecialty,
        condition,
        tagsJson,
        visitDate,
        notes,
        createdAt,
        updatedAt,
      ] = params;

      this.prescriptions.push({
        id: asString(id),
        patientId: asString(patientId),
        photoUri: asString(photoUri),
        doctorName: asString(doctorName),
        doctorSpecialty: (doctorSpecialty as string | null) ?? null,
        condition: asString(condition),
        tags: [],
        tagsJson: asString(tagsJson),
        visitDate: asString(visitDate),
        notes: (notes as string | null) ?? null,
        createdAt: asString(createdAt),
        updatedAt: asString(updatedAt),
      });
      return;
    }

    if (sql.startsWith("UPDATE prescriptions")) {
      if (sql.startsWith("UPDATE prescriptions SET patientId")) {
        const [targetPatientId, sourcePatientId] = params;
        this.prescriptions = this.prescriptions.map((row) =>
          row.patientId === sourcePatientId
            ? { ...row, patientId: asString(targetPatientId) }
            : row
        );
        return;
      }

      const [
        photoUri,
        doctorName,
        doctorSpecialty,
        condition,
        tagsJson,
        visitDate,
        notes,
        updatedAt,
        id,
      ] = params;
      const prescription = this.prescriptions.find((row) => row.id === id);
      if (prescription) {
        prescription.photoUri = asString(photoUri);
        prescription.doctorName = asString(doctorName);
        prescription.doctorSpecialty =
          (doctorSpecialty as string | null) ?? null;
        prescription.condition = asString(condition);
        prescription.tagsJson = asString(tagsJson);
        prescription.visitDate = asString(visitDate);
        prescription.notes = (notes as string | null) ?? null;
        prescription.updatedAt = asString(updatedAt);
      }
      return;
    }

    if (sql.startsWith("DELETE FROM prescriptions")) {
      const [id] = params;
      this.prescriptions = this.prescriptions.filter((row) => row.id !== id);
      return;
    }

    if (sql.startsWith("INSERT INTO schema_migrations")) {
      const [id, appliedAt] = params;
      this.migrations.push({
        id: asString(id),
        appliedAt: asString(appliedAt),
      });
      return;
    }
  }

  async getFirstAsync<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    if (sql.startsWith("SELECT * FROM patients WHERE id")) {
      const [id] = params;
      const patient = this.patients.find((row) => row.id === id);
      return (patient as T) ?? null;
    }

    if (sql.startsWith("SELECT * FROM prescriptions WHERE id")) {
      const [id] = params;
      const prescription = this.prescriptions.find((row) => row.id === id);
      return (prescription as T) ?? null;
    }

    return null;
  }

  async getAllAsync<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    if (sql.startsWith("SELECT id FROM schema_migrations")) {
      return this.migrations.map((row) => ({ id: row.id })) as T[];
    }

    if (sql.startsWith("SELECT * FROM patients")) {
      return [...this.patients]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row })) as T[];
    }

    if (sql.startsWith("SELECT * FROM prescriptions WHERE patientId")) {
      const [patientId] = params;
      return this.prescriptions
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
        .map((row) => ({ ...row })) as T[];
    }

    return [];
  }
}
