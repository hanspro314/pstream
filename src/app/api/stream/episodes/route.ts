/* Episodes API Proxy — fetches episode list for a series from the upstream movie API
 *
 * Returns all episodes/parts for a given series using the series video ID,
 * series code, and total episode count.
 *
 * REQUIRES valid PStream access token — checks on every request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';

export async function GET(request: NextRequest) {
  try {
    // ─── Token validation ──────────────────────────
    const tokenCheck = await validateRequestToken(request);
    if (!tokenCheck.valid) return tokenCheck.response;

    const { searchParams } = new URL(request.url);
    const vid = searchParams.get('vid');
    const scode = searchParams.get('scode');
    const no = searchParams.get('no');

    if (!vid || !scode || !no) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: vid, scode, no' },
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

    const res = await fetch(
      `${API_BASE}/episodes/range/${encodeURIComponent(vid)}/${encodeURIComponent(scode)}/${encodeURIComponent(no)}`,
      {
        method: 'GET',
        headers,
      }
    );

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
