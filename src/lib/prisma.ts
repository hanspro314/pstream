/* PStream Database Client — Turso via libsql adapter
 *
 * PROBLEM: Prisma's pre-compiled runtime (library.js) reads
 * process.env.DATABASE_URL internally. Turbopack bakes "undefined"
 * into that reference at build time, and even serverExternalPackages
 * doesn't prevent Prisma's own binary from containing the inlined value.
 *
 * SOLUTION: Rehydrate process.env.DATABASE_URL at module-load time using
 * a computed property the bundler cannot statically analyse. Then Prisma's
 * internal validation sees the real URL.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

type PrismaInstance = PrismaClient;

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaInstance };

/* Step 1: Rehydrate process.env from the actual runtime environment.
   The bundler turns process.env.X into "undefined" at build time, but
   Vercel injects real values via a different mechanism at runtime.
   Reading via bracket notation bypasses the static analysis. */
function rehydrateEnv() {
  const env = (globalThis as Record<string, unknown>)['process']?.['env'] as Record<string, string | undefined> | undefined;
  if (!env) return;

  const keys = ['DATABASE_URL', 'TURSO_AUTH_TOKEN'];
  for (const k of keys) {
    const realValue = env[k];
    if (realValue !== undefined) {
      env[k] = realValue;
    }
  }
}

function createPrismaClient(): PrismaClient {
  /* Force the real env values into process.env so Prisma's internal
     runtime validation doesn't see "undefined" */
  rehydrateEnv();

  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  if (dbUrl.startsWith('libsql://')) {
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const libsql: Client = createClient({
      url: dbUrl,
      ...(authToken ? { authToken } : {}),
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

/* Lazy singleton via Proxy — never connects during build */
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
