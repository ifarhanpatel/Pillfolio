module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/e2e/",
    "/__tests__/helpers/",
    "/__tests__/fixtures/",
  ],
  moduleNameMapper: {
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
  },
};
