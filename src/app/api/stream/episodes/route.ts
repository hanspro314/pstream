/* Episodes API Proxy — fetches episode list for a series from the upstream movie API
 *
 * Upstream returns VID RANGES (e.g. "63158__63173"), not individual episodes.
 * This endpoint:
 *   1. Fetches the range data from upstream
 *   2. Expands each range into individual episode VIDs
 *   3. Fetches preview for each VID to get real titles and playing URLs
 *   4. Returns a proper episode list
 *
 * REQUIRES valid PStream access token — checks on every request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequestToken } from '@/lib/validate-token';

const API_BASE = 'https://munoapi.com/api';
const JWT_TOKEN = process.env.PSTREAM_API_TOKEN || '';
const USER_ID = process.env.MOVIE_API_USER_ID || '';

interface EpisodeResult {
  id: number;
  vid: string;
  title: string;
  thumbnail: string;
  duration: string;
  episode: number;
  playingUrl?: string;
  episode_name?: string;
}

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': 'Android IOS v3.0' };
  if (JWT_TOKEN) {
    h['X-API-Key'] = JWT_TOKEN;
    h['Authorization'] = `Bearer ${JWT_TOKEN}`;
  }
  return h;
}

// Parse "63158__63173" → [63158, 63159, ..., 63173]
function expandRange(rangeStr: string): number[] {
  const parts = rangeStr.split('__');
  if (parts.length !== 2) return [];
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const vids: number[] = [];
  for (let v = start; v <= end; v++) {
    vids.push(v);
  }
  return vids;
}

// Fetch preview for a single VID to get episode title + playing URL
async function fetchEpisodePreview(vid: number): Promise<{
  title: string;
  thumbnail: string;
  duration: string;
  playingUrl: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/preview/v2/${vid}/${USER_ID}`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const preview = data.preview || data;
    return {
      title: preview.video_title || preview.video_name || '',
      thumbnail: preview.thumbnail || preview.image || '',
      duration: preview.duration || preview.ldur || '',
      playingUrl: preview.playingUrl || '',
    };
  } catch {
    return null;
  }
}

// Cache episode results (server-side)
const episodeCache = new Map<string, { data: EpisodeResult[]; timestamp: number }>();
const EPISODE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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

    const episodeCount = parseInt(no, 10);
    if (isNaN(episodeCount) || episodeCount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid episode count' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${vid}_${scode}_${no}`;
    const cached = episodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < EPISODE_CACHE_TTL) {
      return NextResponse.json({ success: true, data: cached.data });
    }

    // ─── Step 1: Fetch episode ranges from upstream ───
    const rangeRes = await fetch(
      `${API_BASE}/episodes/range/${encodeURIComponent(vid)}/${encodeURIComponent(scode)}/${encodeURIComponent(no)}`,
      {
        method: 'GET',
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!rangeRes.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream returned ${rangeRes.status}` },
        { status: rangeRes.status }
      );
    }

    const rangeData = await rangeRes.json();
    const ranges = Array.isArray(rangeData) ? rangeData : [];

    if (ranges.length === 0) {
      // No ranges — generate placeholder episodes
      const fallback: EpisodeResult[] = [];
      for (let i = 1; i <= episodeCount; i++) {
        fallback.push({
          id: parseInt(vid, 10) + i,
          vid: `${vid}-${i}`,
          title: `Episode ${i}`,
          thumbnail: '',
          duration: '',
          episode: i,
        });
      }
      episodeCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
      return NextResponse.json({ success: true, data: fallback });
    }

    // ─── Step 2: Expand ranges into individual VIDs ───
    const allVids: number[] = [];
    for (const range of ranges) {
      const rangeStr = range.eps_range || range.range || '';
      const vids = expandRange(rangeStr);
      allVids.push(...vids);
    }

    // Deduplicate
    const uniqueVids = [...new Set(allVids)];

    if (uniqueVids.length === 0) {
      // Fallback
      const fallback: EpisodeResult[] = [];
      for (let i = 1; i <= episodeCount; i++) {
        fallback.push({
          id: parseInt(vid, 10) + i,
          vid: `${vid}-${i}`,
          title: `Episode ${i}`,
          thumbnail: '',
          duration: '',
          episode: i,
        });
      }
      episodeCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
      return NextResponse.json({ success: true, data: fallback });
    }

    // ─── Step 3: Fetch preview for each episode VID (batched) ───
    const BATCH_SIZE = 10;
    const episodes: EpisodeResult[] = [];

    for (let i = 0; i < uniqueVids.length; i += BATCH_SIZE) {
      const batch = uniqueVids.slice(i, i + BATCH_SIZE);
      const previews = await Promise.allSettled(
        batch.map(v => fetchEpisodePreview(v))
      );

      for (let j = 0; j < previews.length; j++) {
        const epVid = batch[j];
        const result = previews[j];
        const epNum = i + j + 1;

        if (result.status === 'fulfilled' && result.value) {
          const preview = result.value;
          // Strip the base series name from episode title (e.g. "God's Gift: 14 Days 3" → "Episode 3")
          let epTitle = preview.title;
          const baseTitle = ''; // Will be filled by the detail page
          // If title ends with a number, it's likely the episode number
          episodes.push({
            id: epVid,
            vid: String(epVid),
            title: epTitle || `Episode ${epNum}`,
            thumbnail: preview.thumbnail,
            duration: preview.duration,
            episode: epNum,
            playingUrl: preview.playingUrl,
            episode_name: epTitle || `Episode ${epNum}`,
          });
        } else {
          episodes.push({
            id: epVid,
            vid: String(epVid),
            title: `Episode ${epNum}`,
            thumbnail: '',
            duration: '',
            episode: epNum,
          });
        }
      }
    }

    // Cache the result
    episodeCache.set(cacheKey, { data: episodes, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: episodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
