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
    '^.*lib/prisma\\.js$': '<rootDir>/tests/__mocks__/prismaSingleton.ts',
    '^../generated/prisma/client\\.js$': '<rootDir>/tests/__mocks__/prismaClient.ts',
    '^.*/generated/prisma/client\\.js$': '<rootDir>/tests/__mocks__/prismaClient.ts',
    // Strip .js extensions for ts-jest (ESM compat)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^.*lib/prisma$': '<rootDir>/tests/__mocks__/prismaSingleton.ts',
    '^../generated/prisma/client$': '<rootDir>/tests/__mocks__/prismaClient.ts',
    // Map @core/* path alias
    '^@core/(.*)$': '<rootDir>/../core/$1',
    // Map @/* path alias
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock Prisma 7 generated client (uses import.meta.url, incompatible with Jest CJS)
    '^.*/generated/prisma/client$': '<rootDir>/tests/__mocks__/prismaClient.ts',
    '^redis$': '<rootDir>/tests/__mocks__/redis.ts',
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',        // Entry point (thin)
    '!src/**/*.d.ts',
    '!src/generated/**',    // Auto-generated Prisma files
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
