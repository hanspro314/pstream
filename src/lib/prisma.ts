/* PStream Database Client — Turso via libsql driver adapter
 *
 * The Prisma schema uses a hardcoded dummy URL. All real database
 * connectivity is handled by the @prisma/adapter-libsql adapter, which
 * reads the Turso URL and auth token from environment variables at
 * runtime. Prisma's own internal engine never touches DATABASE_URL. */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

type PrismaInstance = PrismaClient;

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaInstance };

function createPrismaClient(): PrismaClient {
  // Read Turso credentials via bracket notation to prevent Turbopack
  // from statically inlining "undefined" at build time.
  const urlKey = 'DATABASE_URL';
  const tokenKey = 'TURSO_AUTH_TOKEN';
  const env = (globalThis as Record<string, Record<string, string | undefined>>)
    ['process']?.['env'];

  const dbUrl = env?.[urlKey];
  const authToken = env?.[tokenKey];

  // If no DATABASE_URL, fall back to local SQLite via Prisma's default
  if (!dbUrl || !dbUrl.startsWith('libsql://')) {
    return new PrismaClient();
  }

  // Remote Turso database via libsql adapter
  const libsql: Client = createClient({
    url: dbUrl,
    ...(authToken ? { authToken } : {}),
  });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

/* Lazy singleton — never connects at module-load / build time */
export const prisma: PrismaInstance = new Proxy({} as PrismaInstance, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    const actual = globalForPrisma._prisma;
    const value = Reflect.get(actual, prop, actual);
    if (typeof value === 'function') {
      return value.bind(actual);
    }
    return value;
  },
});
