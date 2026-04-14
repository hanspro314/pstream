/* Search API Proxy — searches the upstream movie API catalog
 *
 * REQUIRES valid PStream access token — checks on every request.
 * Returns normalized results with consistent field names (vid, playingurl, etc.)
 * to ensure frontend compatibility across all data sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';
import { normalizeMovieArray } from '@/lib/normalize-movie';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';
const USER_ID = process.env.MOVIE_API_USER_ID || '';

export async function GET(request: NextRequest) {
  try {
    // ─── Token validation ──────────────────────────
    const tokenCheck = await validateRequestToken(request);
    if (!tokenCheck.valid) return tokenCheck.response;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '0', 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing query parameter' },
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

    const res = await fetch(`${API_BASE}/search/${encodeURIComponent(query)}/${USER_ID}/${page}`, {
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

    // Normalize the response to ensure consistent field names
    // Upstream search returns array directly — normalize each item
    if (Array.isArray(data)) {
      return NextResponse.json({
        success: true,
        data: normalizeMovieArray(data),
      });
    }

    // Handle nested response formats (some endpoints wrap in { data: [...] })
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const key of ['data', 'results', 'items', 'movies', 'list', 'search']) {
        if (Array.isArray(obj[key])) {
          return NextResponse.json({
            success: true,
            data: normalizeMovieArray(obj[key] as unknown[]),
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
