import { defineConfig, env } from 'prisma/config';

// Prisma 7 does not read .env by itself. Node's built-in loader handles it with
// no extra dependency; in a container the variables are already in the
// environment and there is no file to read, so a miss here is not an error.
try {
  process.loadEnvFile();
} catch {
  // No .env file — expected in production.
}

/**
 * Prisma 7 no longer accepts `url` inside the schema's datasource block.
 * The connection string for migrate/introspect lives here; the runtime client
 * gets its connection through a driver adapter in src/lib/db.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
