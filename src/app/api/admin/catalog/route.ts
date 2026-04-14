/* Admin Catalog API — Read-only movie catalog explorer for admin dashboard
 *
 * SECURITY: This endpoint does NOT require a user access token.
 * It is protected by the admin PIN gate on the frontend (sessionStorage check).
 * The upstream API credentials are never exposed to the client.
 *
 * Reuses the same in-memory library cache from /api/stream/library.
 * Returns movie items with sanitized fields only (no internal IDs, no upstream metadata).
 */

import { NextResponse } from 'next/server';
import { normalizeMovieItem, type NormalizedMovie } from '@/lib/normalize-movie';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';
const USER_ID = process.env.MOVIE_API_USER_ID || '';

// Known categories from the Python CLI
const KNOWN_CATEGORIES = [4, 17, 18, 20, 1, 23, 6, 22, 5, 9, 3, 10, 8];

// Genre terms for broader search coverage
const GENRE_TERMS = [
  'Action', 'Romance', 'Comedy', 'Horror', 'Drama', 'Thriller',
  'Sci Fi', 'Documentary', 'Animation', 'Adventure', 'Crime',
  'Fantasy', 'Mystery', 'War', 'Family', 'Love', 'King', 'Queen',
  'The', 'Life', 'Story', 'Dark', 'Night', 'Star', 'World',
  'Power', 'City', 'Blood', 'Fire', 'Game', 'Man', 'Woman',
];

// Category name mapping from upstream category_id
const CATEGORY_NAMES: Record<number, string> = {
  1: 'Nollywood',
  2: 'Action',
  3: 'Comedy',
  4: 'Drama',
  5: 'Series',
  6: 'Horror',
  7: 'Sci-Fi',
  8: 'Thriller',
  9: 'Romance',
  10: 'Animation',
  12: 'Documentary',
  13: 'Kids',
  14: 'Adventure',
  15: 'Fantasy',
  17: 'Latest',
  18: 'Trending',
  19: 'Music',
  20: 'New Releases',
  22: 'Crime',
  23: 'War',
};

// ─── Auth headers ─────────────────────────────────────────────
function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': 'Android IOS v3.0' };
  if (JWT_TOKEN) {
    h['X-API-Key'] = JWT_TOKEN;
    h['Authorization'] = `Bearer ${JWT_TOKEN}`;
  }
  return h;
}

// ─── Fetch upstream endpoint ──────────────────────────────────
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
  } catch { /* skip */ }
  return null;
}

// ─── Extract items from any response format ───────────────────
function extractMovieItems(data: unknown): NormalizedMovie[] {
  const items: NormalizedMovie[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object' && (item.id || item.vid)) {
        items.push(normalizeMovieItem(item as Record<string, unknown>));
      }
    }
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['list', 'data', 'movies', 'shows', 'items', 'tabs', 'browse', 'results', 'search', 'dashboard']) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key] as unknown[]) {
          if (item && typeof item === 'object' && ((item as Record<string, unknown>).id || (item as Record<string, unknown>).vid)) {
            items.push(normalizeMovieItem(item as Record<string, unknown>));
          }
        }
      }
    }
  }
  return items;
}

// ─── In-memory cache (shared logic with library route) ────────
let cachedCatalog: { movies: NormalizedMovie[]; timestamp: number; categories: Map<number, string> } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function buildCatalog(): Promise<{ movies: NormalizedMovie[]; categories: Map<number, string> }> {
  const movieMap = new Map<number, NormalizedMovie>();
  const categoryMap = new Map<number, string>();

  // 1. Dashboard
  const dashData = await fetchUpstream(`dashboard/v2/${USER_ID}`, 30000);
  if (dashData && typeof dashData === 'object') {
    const dashObj = dashData as Record<string, unknown>;
    const categories = Array.isArray(dashObj.dashboard) ? dashObj.dashboard : [];
    for (const cat of categories) {
      const catObj = cat as Record<string, unknown>;
      const catName = String(catObj.category || '');
      const catId = Number(catObj.category_id || catObj.id || 0);
      const movies = catObj.movies;
      if (Array.isArray(movies) && catId) {
        categoryMap.set(catId, catName);
        for (const m of movies) {
          const item = normalizeMovieItem(m as Record<string, unknown>);
          if (item.id && !movieMap.has(item.id)) {
            movieMap.set(item.id, item);
          }
        }
      }
    }
  }

  // 2. Search tasks: a-z + 0-9 (10 pages each)
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

  // 3. Genre searches (5 pages each)
  for (const term of GENRE_TERMS) {
    for (let pg = 0; pg < 5; pg++) {
      tasks.push(`search/${encodeURIComponent(term)}/${USER_ID}/${pg}`);
    }
  }

  // 4. List + Shows endpoints
  for (const catId of KNOWN_CATEGORIES) {
    for (let pg = 0; pg < 10; pg++) {
      tasks.push(`list/${catId}/${pg}/${USER_ID}/0`);
      tasks.push(`shows/${catId}/${pg}/${USER_ID}/0`);
    }
  }

  // 5. Browse endpoints
  tasks.push('browse/tabs');
  tasks.push('browse/movies');
  tasks.push('browse/series');

  // Fetch all concurrently (batches of 20)
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

  // Fill category names from our mapping
  for (const [id, name] of Object.entries(CATEGORY_NAMES)) {
    if (!categoryMap.has(Number(id))) {
      categoryMap.set(Number(id), name);
    }
  }

  // Filter out raw episode fragments
  const filtered = Array.from(movieMap.values()).filter((m) => {
    const title = m.title.trim();
    if (/^EPS\s*\d*\s*$/i.test(title)) return false;
    if (title.length < 3) return false;
    return true;
  });

  return { movies: filtered, categories: categoryMap };
}

export async function GET() {
  try {
    if (!USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Movie API not configured' },
        { status: 503 }
      );
    }

    // Return cached if fresh
    if (cachedCatalog && Date.now() - cachedCatalog.timestamp < CACHE_TTL) {
      const catObj: Record<number, string> = {};
      cachedCatalog.categories.forEach((v, k) => { catObj[k] = v; });
      return NextResponse.json({
        success: true,
        data: {
          movies: cachedCatalog.movies,
          categories: catObj,
          meta: {
            total: cachedCatalog.movies.length,
            cached: true,
            age: Math.round((Date.now() - cachedCatalog.timestamp) / 1000),
          },
        },
      });
    }

    // Build catalog
    const { movies, categories } = await buildCatalog();
    cachedCatalog = { movies, categories, timestamp: Date.now() };

    const catObj: Record<number, string> = {};
    categories.forEach((v, k) => { catObj[k] = v; });

    return NextResponse.json({
      success: true,
      data: {
        movies,
        categories: catObj,
        meta: {
          total: movies.length,
          cached: false,
        },
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
