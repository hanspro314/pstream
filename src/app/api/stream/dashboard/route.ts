/* Dashboard API Proxy — fetches dashboard data
 *
 * REQUIRES valid token — checks on every request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';

const API_BASE = 'https://munoapi.com/api';

export async function GET(request: NextRequest) {
  try {
    // ─── Token validation ──────────────────────────
    const tokenCheck = await validateRequestToken(request);
    if (!tokenCheck.valid) return tokenCheck.response;

    const res = await fetch(`${API_BASE}/dashboard/v2/82717`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Android IOS v3.0',
      },
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
