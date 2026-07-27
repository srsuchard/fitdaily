/**
 * Jest config for FitDaily. Uses the `jest-expo` preset so RN/Expo modules and
 * the TypeScript + JSX transform work out of the box. Path alias `@/` mirrors
 * tsconfig so tests import modules the same way the app does.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/*.d.ts'],
};
