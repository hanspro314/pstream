/* PStream Database Client — supports local SQLite and Turso (cloud libsql) */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  if (dbUrl.startsWith('libsql://')) {
    // Remote Turso database — use libsql adapter
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const libsql: Client = createClient({
      url: dbUrl,
      ...(authToken ? { authToken } : {}),
    });
    const adapter = new PrismaLibSQL(libsql);

    // Explicitly pass datasources URL — Prisma's bundled engine cannot
    // read process.env.DATABASE_URL on Vercel, so we force-feed it here.
    return new PrismaClient({
      adapter,
      datasources: { db: { url: dbUrl } },
    });
  }

  // Local SQLite file — use default Prisma SQLite engine
  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
