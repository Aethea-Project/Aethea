/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Strip .js extensions for ts-jest (ESM compat)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map @core/* path alias
    '^@core/(.*)$': '<rootDir>/../core/$1',
    // Map @/* path alias
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',        // Entry point (thin)
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
