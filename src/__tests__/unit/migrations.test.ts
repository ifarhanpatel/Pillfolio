import { MIGRATIONS } from "../../db/migrations";
import { FakeDriver } from "../helpers/fakeDriver";

describe("migrations", () => {
  const loadInitializeDb = () => {
    const dbModule = require("../../db") as typeof import("../../db");
    return dbModule.initializeDb;
  };

  beforeEach(() => {
    jest.resetModules();
  });

  test("initializeDb applies missing migrations", async () => {
    const initializeDb = loadInitializeDb();
    const driver = new FakeDriver();

    await initializeDb(driver);

    for (const migration of MIGRATIONS) {
      for (const statement of migration.up) {
        expect(driver.executed).toContain(statement);
      }
    }

    expect(driver.migrations).toHaveLength(MIGRATIONS.length);
    expect(driver.migrations.map((m) => m.id)).toEqual(
      MIGRATIONS.map((m) => m.id)
    );
  });

  test("initializeDb skips applied migrations", async () => {
    const initializeDb = loadInitializeDb();
    const driver = new FakeDriver();
    driver.migrations.push({
      id: MIGRATIONS[0].id,
      appliedAt: "2025-01-01T00:00:00.000Z",
    });

    await initializeDb(driver);

    const appliedStatements = MIGRATIONS[0].up
      .filter(
        (statement) =>
          !statement.startsWith(
            "CREATE TABLE IF NOT EXISTS schema_migrations"
          )
      )
      .filter((statement) => driver.executed.includes(statement));

    expect(appliedStatements).toHaveLength(0);
    expect(driver.executed).toContain(MIGRATIONS[1].up[0]);
    expect(driver.executed).toContain(MIGRATIONS[2].up[0]);
    expect(driver.migrations).toHaveLength(3);
    expect(driver.migrations[1].id).toBe(MIGRATIONS[1].id);
    expect(driver.migrations[2].id).toBe(MIGRATIONS[2].id);
  });
});
