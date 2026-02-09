import type { SqlDriver } from "./driver";
import { MIGRATIONS } from "./migrations";
import { createExpoSqliteDriver } from "./expoSqliteDriver";

export const openDb = async (): Promise<SqlDriver> => {
  return createExpoSqliteDriver();
};

export const initializeDb = async (driver: SqlDriver): Promise<void> => {
  await driver.runAsync("PRAGMA foreign_keys = ON;");
  await driver.runAsync(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY NOT NULL, appliedAt TEXT NOT NULL);"
  );

  const applied = await driver.getAllAsync<{ id: string }>(
    "SELECT id FROM schema_migrations ORDER BY id ASC;"
  );
  const appliedSet = new Set(applied.map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.id)) {
      continue;
    }

    await driver.execBatchAsync(migration.up);
    await driver.runAsync(
      "INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?);",
      [migration.id, new Date().toISOString()]
    );
  }
};
