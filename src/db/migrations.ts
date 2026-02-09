export type Migration = {
  id: string;
  up: string[];
};

export const MIGRATIONS: Migration[] = [
  {
    id: "001_init",
    up: [
      "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY NOT NULL, appliedAt TEXT NOT NULL);",
      "CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, relationship TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);",
      "CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY NOT NULL, patientId TEXT NOT NULL, photoUri TEXT NOT NULL, doctorName TEXT NOT NULL, doctorSpecialty TEXT, condition TEXT NOT NULL, tagsJson TEXT NOT NULL, visitDate TEXT NOT NULL, notes TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE);",
      "CREATE INDEX IF NOT EXISTS prescriptions_patientId_idx ON prescriptions(patientId);",
      "CREATE INDEX IF NOT EXISTS prescriptions_visitDate_idx ON prescriptions(visitDate);",
    ],
  },
];
