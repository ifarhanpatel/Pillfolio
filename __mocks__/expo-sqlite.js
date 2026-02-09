module.exports = {
  openDatabaseAsync: async () => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  }),
  openDatabase: () => ({
    transaction: jest.fn(),
  }),
};
