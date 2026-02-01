module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/otel.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    './src/auth.ts': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
};
