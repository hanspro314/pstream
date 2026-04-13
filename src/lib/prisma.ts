/* PStream Database Client — supports local SQLite and Turso (cloud libsql)
 *
 * Uses LAZY initialization so Prisma is only created on the first actual
 * API call, never during Next.js build-time page data collection.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

type PrismaInstance = PrismaClient;

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaInstance };

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  if (dbUrl.startsWith('libsql://')) {
    // Remote Turso — libsql adapter handles ALL connection concerns.
    // Do NOT pass datasources — it's incompatible with Driver Adapters.
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const libsql: Client = createClient({
      url: dbUrl,
      ...(authToken ? { authToken } : {}),
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  // Local SQLite — Prisma uses its own built-in SQLite engine
  return new PrismaClient();
}

/* Lazy singleton: created on first access, never at import/module-load time */
export const prisma: PrismaInstance = new Proxy({} as PrismaInstance, {
  get(_target, prop, receiver) {
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
