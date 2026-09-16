import { defineConfig } from 'prisma/config';

// Prisma 7 does not read .env by itself. Node's built-in loader handles it with
// no extra dependency; in a container or CI pipeline the variables may be in
// the environment or absent during generation, so a miss here is handled gracefully.
try {
  process.loadEnvFile();
} catch {
  // No .env file — expected in CI or production.
}

const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

/**
 * Prisma 7 no longer accepts `url` inside the schema's datasource block.
 * The connection string for migrate/introspect lives here; the runtime client
 * gets its connection through a driver adapter in src/lib/db.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
