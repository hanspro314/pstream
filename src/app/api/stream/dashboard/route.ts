/* Dashboard API Proxy — fetches dashboard data from the upstream movie API
 *
 * REQUIRES valid PStream access token — checks on every request.
 * Sends API key auth headers to upstream for full content access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';
const USER_ID = process.env.MOVIE_API_USER_ID || '';

export async function GET(request: NextRequest) {
  try {
    // ─── Token validation ──────────────────────────
    const tokenCheck = await validateRequestToken(request);
    if (!tokenCheck.valid) return tokenCheck.response;

    if (!USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Movie API user ID not configured' },
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Android IOS v3.0',
    };
    if (JWT_TOKEN) {
      headers['X-API-Key'] = JWT_TOKEN;
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const res = await fetch(`${API_BASE}/dashboard/v2/${USER_ID}`, {
      method: 'GET',
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes server-side
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
