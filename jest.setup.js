import "@testing-library/jest-native/extend-expect";

const mockAsyncStorageState = new Map();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key) =>
    mockAsyncStorageState.has(key) ? mockAsyncStorageState.get(key) : null
  ),
  setItem: jest.fn(async (key, value) => {
    mockAsyncStorageState.set(key, value);
  }),
  removeItem: jest.fn(async (key) => {
    mockAsyncStorageState.delete(key);
  }),
  clear: jest.fn(async () => {
    mockAsyncStorageState.clear();
  }),
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: jest.fn((Component) => Component),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  startSpan: jest.fn((_options, callback) => callback()),
  reactNativeTracingIntegration: jest.fn((options) => ({ name: "reactNativeTracingIntegration", options })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorageState.clear();
  const { resetDbStateForTests } = require("./src/db");
  resetDbStateForTests();
});
