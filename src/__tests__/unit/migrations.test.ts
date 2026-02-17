import { FakeDriver } from "../helpers/fakeDriver";

describe("migrations", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("initializeDb applies missing migrations", async () => {
    const { initializeDb } = require("../../db");
    const { MIGRATIONS } = require("../../db/migrations");
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
    const { initializeDb } = require("../../db");
    const { MIGRATIONS } = require("../../db/migrations");
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
    expect(driver.migrations).toHaveLength(2);
    expect(driver.migrations[1].id).toBe(MIGRATIONS[1].id);
  });
});
