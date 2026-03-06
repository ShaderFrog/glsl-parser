import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/*.js'],
    },
  },
  test: {
    globalSetup: './vitest.global-setup.ts',
    include: ['src/**/*.test.ts'],
  },
});
