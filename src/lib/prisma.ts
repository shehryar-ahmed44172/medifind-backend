import { PrismaClient } from '@prisma/client';

/**
 * Prisma Singleton
 *
 * A single shared PrismaClient instance for the entire application.
 * PostgreSQL has a default connection limit (~100). Without this singleton,
 * every repository and service file that does `new PrismaClient()` opens its
 * own connection pool, exhausting the limit under any real load.
 *
 * The `global` trick prevents hot-reload (ts-node-dev / nodemon) from
 * creating a new pool on every file-save in development.
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
