module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/otel.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};
