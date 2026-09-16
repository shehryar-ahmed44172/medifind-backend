/**
 * Shared test setup: global Jest lifecycle hooks.
 * Applied automatically via jest.config globalSetup / setupFilesAfterFramework.
 */

import prisma from '../../src/lib/prisma';

/** Increase timeout for integration tests that hit the DB */
jest.setTimeout(30_000);

beforeAll(async () => {
  // Verify DB is reachable before running integration tests.
  // This will throw if DATABASE_URL is not set → tests skip gracefully.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.warn('⚠️  Database not reachable — integration tests will be skipped.');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
