import "@testing-library/jest-native/extend-expect";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: jest.fn((Component) => Component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { resetDbStateForTests } = require("./src/db");
  resetDbStateForTests();
});
