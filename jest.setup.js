import "@testing-library/jest-native/extend-expect";

beforeEach(() => {
  jest.clearAllMocks();
  const { resetDbStateForTests } = require("./src/db");
  resetDbStateForTests();
});
