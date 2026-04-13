import { NextResponse } from 'next/server';

export async function GET() {
  const env = process.env;
  return NextResponse.json({
    DATABASE_URL: env.DATABASE_URL ? `${env.DATABASE_URL.slice(0, 20)}...` : 'UNDEFINED',
    TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN ? `***${env.TURSO_AUTH_TOKEN.slice(-4)}` : 'UNDEFINED',
    COMMIT_SHA: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'UNKNOWN',
    COMMIT_MSG: env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0]?.slice(0, 60) || 'UNKNOWN',
    DEPLOYMENT_ID: env.VERCEL_DEPLOYMENT_ID?.slice(0, 8) || 'UNKNOWN',
    DEPLOYMENT_URL: env.VERCEL_URL || 'UNKNOWN',
  });
}
