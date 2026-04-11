/* Preview API Proxy — fetches movie details with JWT auth */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://munoapi.com/api';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vid = searchParams.get('vid');

    if (!vid) {
      return NextResponse.json(
        { success: false, error: 'Missing vid parameter' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/preview/${vid}/82717`, {
      method: 'GET',
      headers: {
        'X-API-Key': JWT_TOKEN,
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'User-Agent': 'Android IOS v3.0',
      },
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
