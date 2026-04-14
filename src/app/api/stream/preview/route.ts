/* Preview API Proxy — fetches movie/series details from the upstream movie API
 *
 * Uses the v2 preview endpoint which returns richer data including
 * series info (episode count, series code, language).
 * The v2 response wraps data in a { preview: {...} } envelope.
 *
 * REQUIRES valid PStream access token — checks on every request.
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

    const { searchParams } = new URL(request.url);
    const vid = searchParams.get('vid');

    if (!vid) {
      return NextResponse.json(
        { success: false, error: 'Missing vid parameter' },
        { status: 400 }
      );
    }

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

    // Use v2 endpoint for richer data (series info, language, etc.)
    const res = await fetch(`${API_BASE}/preview/v2/${vid}/${USER_ID}`, {
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

    // v2 wraps the preview in a { preview: {...} } envelope — unwrap it
    if (data && typeof data === 'object' && 'preview' in data && data.preview) {
      return NextResponse.json({ success: true, data: data.preview });
    }

    // Fallback: return as-is (handles non-standard responses gracefully)
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
