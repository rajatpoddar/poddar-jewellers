import { defineConfig } from 'vitest/config';
import path from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // No .env file — expected in production/CI
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
});
