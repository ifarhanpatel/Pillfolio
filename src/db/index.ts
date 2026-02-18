import type { SqlDriver } from "./driver";
import { MIGRATIONS } from "./migrations";
import { createExpoSqliteDriver } from "./expoSqliteDriver";

const DB_OPEN_TIMEOUT_MS = 15000;
let driverPromise: Promise<SqlDriver> | null = null;
let initializationPromise: Promise<void> | null = null;
let initialized = false;

export const resetDbStateForTests = (): void => {
  driverPromise = null;
  initializationPromise = null;
  initialized = false;
};

export const openDb = async (): Promise<SqlDriver> => {
  if (!driverPromise) {
    driverPromise = (async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        return await Promise.race([
          createExpoSqliteDriver(),
          new Promise<SqlDriver>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error("Database initialization timed out."));
            }, DB_OPEN_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    })().catch((error) => {
      driverPromise = null;
      throw error;
    });
  }

  return driverPromise;
};

const initializeDbOnce = async (driver: SqlDriver): Promise<void> => {
  await driver.execBatchAsync([
    "PRAGMA foreign_keys = ON;",
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY NOT NULL, appliedAt TEXT NOT NULL);",
  ]);

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

export const initializeDb = async (driver: SqlDriver): Promise<void> => {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = initializeDbOnce(driver)
      .then(() => {
        initialized = true;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  await initializationPromise;
};
