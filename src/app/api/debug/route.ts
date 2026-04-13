import { NextResponse } from 'next/server';

/* One-time diagnostic — tells us exactly what env vars Vercel sees at runtime.
   DELETE THIS FILE after debugging. */

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 15)}...` : 'UNDEFINED',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? `***${process.env.TURSO_AUTH_TOKEN.slice(-4)}` : 'UNDEFINED',
    PSTREAM_ADMIN_PIN: process.env.PSTREAM_ADMIN_PIN ? `***` : 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV || 'UNDEFINED',
    allEnvKeys: Object.keys(process.env).filter(k =>
      !k.includes('SECRET') && !k.includes('TOKEN') && !k.includes('KEY') && !k.includes('PIN') && !k.includes('PASSWORD')
    ),
  });
}
