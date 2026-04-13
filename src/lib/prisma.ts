/* PStream Database Client — Turso via libsql adapter
 *
 * CRITICAL: Uses computed property access for env vars to prevent
 * Turbopack from statically replacing process.env.DATABASE_URL
 * with 'undefined' during build. This is a known Next.js bundler
 * issue with @prisma/client's internal runtime.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

type PrismaInstance = PrismaClient;

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaInstance };

/* Read env vars through computed keys so the bundler cannot inline them.
   Turbopack replaces `process.env.DATABASE_URL` → "undefined" at build
   time, but it cannot do this with `process.env["DAT" + "ABASE_URL"]`. */
function getEnv(name: string): string | undefined {
  return (globalThis as Record<string, unknown>)['process']?.['env']?.[name] as string | undefined;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getEnv('DATABASE_URL') || 'file:./prisma/dev.db';

  if (dbUrl.startsWith('libsql://')) {
    const authToken = getEnv('TURSO_AUTH_TOKEN');
    const libsql: Client = createClient({
      url: dbUrl,
      ...(authToken ? { authToken } : {}),
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

/* Lazy singleton via Proxy — never connects at module-load / build time */
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
