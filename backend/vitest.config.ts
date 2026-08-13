import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Integration tests share one real Postgres DB and reset it between
    // tests — run files serially so two suites don't wipe each other's data
    // mid-test.
    fileParallelism: false,
    setupFiles: ['./src/__tests__/helpers/setupEnv.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
