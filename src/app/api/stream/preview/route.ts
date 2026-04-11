/* Preview API Proxy — fetches movie details with JWT auth */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://munoapi.com/api';

const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';

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

    const headers: Record<string, string> = {
        'User-Agent': 'Android IOS v3.0',
      };
    if (JWT_TOKEN) {
      headers['X-API-Key'] = JWT_TOKEN;
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const res = await fetch(`${API_BASE}/preview/${vid}/82717`, {
      method: 'GET',
      headers,
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
