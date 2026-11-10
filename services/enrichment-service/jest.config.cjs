module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
