/* Dashboard API Proxy — fetches dashboard data without auth */

import { NextResponse } from 'next/server';

const API_BASE = 'https://munoapi.com/api';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/v2/82717`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Android IOS v3.0',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
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
