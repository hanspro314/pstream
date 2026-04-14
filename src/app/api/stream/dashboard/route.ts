/* Dashboard API Proxy — fetches dashboard data from the upstream movie API
 *
 * REQUIRES valid PStream access token — checks on every request.
 * Normalizes all movie objects to ensure consistent field names (vid, playingurl, etc.)
 * across dashboard, search, and library data sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';
import { normalizeMovieItem } from '@/lib/normalize-movie';

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

    // Normalize dashboard categories — ensure each movie has consistent fields
    if (data && typeof data === 'object' && Array.isArray(data.dashboard)) {
      data.dashboard = data.dashboard.map((cat: Record<string, unknown>) => {
        const movies = Array.isArray(cat.movies) ? cat.movies : [];
        return {
          ...cat,
          movies: movies.map((m: Record<string, unknown>) => normalizeMovieItem(m)),
        };
      });
    }

    // Also normalize banner movie if present
    if (data && typeof data === 'object' && data.banner) {
      data.banner = normalizeMovieItem(data.banner as Record<string, unknown>);
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
