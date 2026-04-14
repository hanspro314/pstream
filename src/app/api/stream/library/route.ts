/* Library API — discovers the FULL movie/series catalog from upstream
 *
 * Uses the same multi-endpoint strategy as the Munowatch Python CLI:
 *   1. Dashboard (168 movies from 13 categories)
 *   2. Search: all 26 letters + 10 digits, up to 10 pages each
 *   3. Search: popular genre terms, up to 5 pages each
 *   4. List endpoint: all 13 known categories, paginated
 *   5. Shows endpoint: all 13 known categories, paginated
 *
 * All requests run concurrently (20 threads) for speed.
 * Results are deduplicated by ID — returns ~900+ unique movies.
 * Server-side cached for 10 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';
const USER_ID = process.env.MOVIE_API_USER_ID || '';

interface MovieItem {
  id: number;
  title: string;
  subscriber: string;
  paid: string;
  image: string;
  vj: string;
  vid: string;
  ldur: string;
  category_id: number;
  playingurl: string;
}

// ─── Known categories from the Python CLI ─────────────────────
const KNOWN_CATEGORIES = [4, 17, 18, 20, 1, 23, 6, 22, 5, 9, 3, 10, 8];

// ─── Genre terms for broader search coverage ──────────────────
const GENRE_TERMS = [
  'Action', 'Romance', 'Comedy', 'Horror', 'Drama', 'Thriller',
  'Sci Fi', 'Documentary', 'Animation', 'Adventure', 'Crime',
  'Fantasy', 'Mystery', 'War', 'Family', 'Love', 'King', 'Queen',
  'The', 'Life', 'Story', 'Dark', 'Night', 'Star', 'World',
  'Power', 'City', 'Blood', 'Fire', 'Game', 'Man', 'Woman',
];

// ─── Auth headers ─────────────────────────────────────────────
function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': 'Android IOS v3.0' };
  if (JWT_TOKEN) {
    h['X-API-Key'] = JWT_TOKEN;
    h['Authorization'] = `Bearer ${JWT_TOKEN}`;
  }
  return h;
}

// ─── Fetch a single upstream endpoint ─────────────────────────
async function fetchUpstream(endpoint: string, timeout = 12000): Promise<unknown> {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(timeout),
    });
    if (res.status === 200 && !res.headers.get('content-type')?.includes('html')) {
      return res.json();
    }
  } catch { /* skip failed requests silently */ }
  return null;
}

// ─── Extract movie IDs from any response format ───────────────
function extractMovieItems(data: unknown): MovieItem[] {
  const items: MovieItem[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object' && (item.id || item.vid)) {
        items.push(normalizeMovieItem(item));
      }
    }
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['list', 'data', 'movies', 'shows', 'items', 'tabs', 'browse', 'results', 'search', 'dashboard']) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key] as unknown[]) {
          if (item && typeof item === 'object' && ((item as Record<string, unknown>).id || (item as Record<string, unknown>).vid)) {
            items.push(normalizeMovieItem(item));
          }
        }
      }
    }
  }
  return items;
}

function normalizeMovieItem(raw: Record<string, unknown>): MovieItem {
  const id = Number(raw.id) || 0;
  return {
    id,
    title: String(raw.title || raw.video_title || 'Unknown'),
    subscriber: String(raw.subscriber ?? ''),
    paid: String(raw.paid ?? ''),
    image: String(raw.image || raw.thumbnail || ''),
    vj: String(raw.vj || raw.vjname || ''),
    vid: String(raw.vid || raw.id || ''),
    ldur: String(raw.ldur || raw.duration || ''),
    category_id: Number(raw.category_id) || 0,
    playingurl: String(raw.playingurl || raw.playingUrl || ''),
  };
}

// ─── In-memory cache (server-side, survives between requests) ─
let cachedLibrary: { movies: MovieItem[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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

    // ─── Return cached if fresh ────────────────────
    if (cachedLibrary && Date.now() - cachedLibrary.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cachedLibrary.movies,
        meta: {
          total: cachedLibrary.movies.length,
          cached: true,
          age: Math.round((Date.now() - cachedLibrary.timestamp) / 1000),
        },
      });
    }

    // ─── Build all fetch tasks ─────────────────────
    const movieMap = new Map<number, MovieItem>();

    // 1. Dashboard
    const dashData = await fetchUpstream(`dashboard/v2/${USER_ID}`, 30000);
    if (dashData) {
      const dashObj = dashData as Record<string, unknown>;
      const categories = Array.isArray(dashObj.dashboard) ? dashObj.dashboard : [];
      for (const cat of categories) {
        const movies = (cat as Record<string, unknown>).movies;
        if (Array.isArray(movies)) {
          for (const m of movies) {
            const item = normalizeMovieItem(m as Record<string, unknown>);
            if (item.id && !movieMap.has(item.id)) {
              movieMap.set(item.id, item);
            }
          }
        }
      }
    }

    // 2. Build search tasks: a-z + 0-9 (10 pages each)
    const tasks: string[] = [];
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (const ch of letters) {
      for (let pg = 0; pg < 10; pg++) {
        tasks.push(`search/${ch}/${USER_ID}/${pg}`);
      }
    }
    for (let d = 0; d <= 9; d++) {
      for (let pg = 0; pg < 10; pg++) {
        tasks.push(`search/${d}/${USER_ID}/${pg}`);
      }
    }

    // 3. Genre term searches (5 pages each)
    for (const term of GENRE_TERMS) {
      for (let pg = 0; pg < 5; pg++) {
        tasks.push(`search/${encodeURIComponent(term)}/${USER_ID}/${pg}`);
      }
    }

    // 4. List endpoints (10 pages per category)
    for (const catId of KNOWN_CATEGORIES) {
      for (let pg = 0; pg < 10; pg++) {
        tasks.push(`list/${catId}/${pg}/${USER_ID}/0`);
      }
    }

    // 5. Shows endpoints (10 pages per category)
    for (const catId of KNOWN_CATEGORIES) {
      for (let pg = 0; pg < 10; pg++) {
        tasks.push(`shows/${catId}/${pg}/${USER_ID}/0`);
      }
    }

    // 6. Browse endpoints
    tasks.push('browse/tabs');
    tasks.push('browse/movies');
    tasks.push('browse/series');

    // ─── Fetch all tasks concurrently (batches of 20) ──
    const BATCH_SIZE = 20;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(ep => fetchUpstream(ep)));

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const items = extractMovieItems(result.value);
          for (const item of items) {
            if (item.id && !movieMap.has(item.id)) {
              movieMap.set(item.id, item);
            }
          }
        }
      }
    }

    const movies = Array.from(movieMap.values());

    // ─── Cache the result ──────────────────────────
    cachedLibrary = { movies, timestamp: Date.now() };

    return NextResponse.json({
      success: true,
      data: movies,
      meta: {
        total: movies.length,
        cached: false,
        endpoints_queried: tasks.length + 1, // +1 for dashboard
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
