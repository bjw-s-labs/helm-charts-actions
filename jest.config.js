/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['./src/**'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@apidevtools/json-schema-ref-parser$':
      '<rootDir>/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/index.js'
  },
  preset: 'ts-jest',
  reporters: ['default'],
  resolver: 'ts-jest-resolver',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/dist/', '/node_modules/'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.eslint.json',
        useESM: true
      }
    ]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@apidevtools/json-schema-ref-parser)/)'
  ],
  verbose: true
}
