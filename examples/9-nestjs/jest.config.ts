import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '\\.ts': 'ts-jest',
  },

  testEnvironment: 'node',
};
export default config;
