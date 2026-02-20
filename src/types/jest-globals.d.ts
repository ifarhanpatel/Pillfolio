import type {
  afterAll as AfterAll,
  afterEach as AfterEach,
  beforeAll as BeforeAll,
  beforeEach as BeforeEach,
  describe as Describe,
  expect as Expect,
  it as It,
  jest as Jest,
  test as Test,
} from "@jest/globals";

declare global {
  const jest: typeof Jest;
  const describe: typeof Describe;
  const it: typeof It;
  const test: typeof Test;
  const expect: typeof Expect;
  const beforeEach: typeof BeforeEach;
  const beforeAll: typeof BeforeAll;
  const afterEach: typeof AfterEach;
  const afterAll: typeof AfterAll;
}

export {};
