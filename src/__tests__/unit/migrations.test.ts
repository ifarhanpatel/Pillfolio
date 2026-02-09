import { initializeDb } from "../../db";
import { MIGRATIONS } from "../../db/migrations";
import { FakeDriver } from "../helpers/fakeDriver";

describe("migrations", () => {
  test("initializeDb applies missing migrations", async () => {
    const driver = new FakeDriver();

    await initializeDb(driver);

    for (const statement of MIGRATIONS[0].up) {
      expect(driver.executed).toContain(statement);
    }

    expect(driver.migrations).toHaveLength(1);
    expect(driver.migrations[0].id).toBe(MIGRATIONS[0].id);
  });

  test("initializeDb skips applied migrations", async () => {
    const driver = new FakeDriver();
    driver.migrations.push({
      id: MIGRATIONS[0].id,
      appliedAt: "2025-01-01T00:00:00.000Z",
    });

    await initializeDb(driver);

    const appliedStatements = MIGRATIONS[0].up.filter((statement) =>
      driver.executed.includes(statement)
    );

    expect(appliedStatements).toHaveLength(0);
    expect(driver.migrations).toHaveLength(1);
  });
});
