/* Video Proxy — streams CDN video to the browser, bypassing hotlink / CORS / referer restrictions */

import { NextRequest, NextResponse } from 'next/server';
import { findAccessCode } from '@/lib/db';

// Only allow proxying from these CDN domains for security
const ALLOWED_HOSTS = [
  'lunoluno.b-cdn.net',
  'b-cdn.net',
  'munotech3.com',
  'munoapp.org',
  'bunny.net',
  'munoapi.com',
];

export const runtime = 'nodejs';

// ─── Token Validation Cache ───────────────────────────────────────
// A video makes DOZENS of range requests per minute. Hitting Turso DB
// on every single one adds 50-200ms latency per chunk — the #1 cause
// of streaming hiccups. This in-memory cache caches validated tokens
// for 5 minutes. Security trade-off: max 5 min delay for revocation to
// take effect, which is acceptable for streaming. The cache lives in
// the warm Vercel function instance and is per-invocation-scope.
//
// Cache structure: Map<uppercaseCode, { valid: boolean, tier: string, expiresAt: number }>

interface TokenCacheEntry {
  valid: boolean;
  tier: string | null;
  errorCode: number;
  errorMessage: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const TOKEN_CACHE_TTL_MS = 300_000; // 5 minutes — reduces DB hits that cause buffer stalls
let lastCacheCleanup = Date.now();

function getCachedToken(code: string): TokenCacheEntry | null {
  const entry = tokenCache.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(code);
    return null;
  }
  return entry;
}

function setCachedToken(code: string, entry: TokenCacheEntry) {
  tokenCache.set(code, entry);
  // Periodically clean up expired entries to prevent memory leaks
  if (Date.now() - lastCacheCleanup > 60_000) {
    lastCacheCleanup = Date.now();
    const now = Date.now();
    for (const [key, val] of tokenCache) {
      if (now > val.expiresAt) tokenCache.delete(key);
    }
  }
}

// ─── Validate token (with cache) ──────────────────────────────────
async function validateToken(tokenCode: string): Promise<{ valid: true; tier: string | null } | { valid: false; status: number; error: string }> {
  const normalizedCode = tokenCode.trim().toUpperCase();

  // Check cache first
  const cached = getCachedToken(normalizedCode);
  if (cached) {
    if (cached.valid) {
      return { valid: true, tier: cached.tier };
    }
    return { valid: false, status: cached.errorCode, error: cached.errorMessage };
  }

  // Cache miss — hit the database
  const accessCode = await findAccessCode({ code: normalizedCode });

  if (!accessCode) {
    const result = { valid: false, status: 403, error: 'Invalid access token.' } as const;
    setCachedToken(normalizedCode, {
      valid: false, tier: null, errorCode: 403,
      errorMessage: 'Invalid access token.', expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    return result;
  }

  if (accessCode.status === 'revoked') {
    const result = { valid: false, status: 403, error: 'Access token has been deactivated.' };
    setCachedToken(normalizedCode, {
      valid: false, tier: null, errorCode: 403,
      errorMessage: 'Access token has been deactivated.', expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    return result;
  }

  if (accessCode.status === 'expired' || (accessCode.expiresAt && new Date(String(accessCode.expiresAt)) < new Date())) {
    const result = { valid: false, status: 403, error: 'Access token has expired.' };
    setCachedToken(normalizedCode, {
      valid: false, tier: null, errorCode: 403,
      errorMessage: 'Access token has expired.', expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    return result;
  }

  if (accessCode.status !== 'active') {
    const result = { valid: false, status: 403, error: 'Access token is not active.' };
    setCachedToken(normalizedCode, {
      valid: false, tier: null, errorCode: 403,
      errorMessage: 'Access token is not active.', expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    return result;
  }

  // Valid token — cache for 5 min
  setCachedToken(normalizedCode, {
    valid: true,
    tier: String(accessCode.tier || 'stream'),
    errorCode: 0,
    errorMessage: '',
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  });

  return { valid: true, tier: String(accessCode.tier || 'stream') };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  const isDownload = searchParams.get('download') === '1';
  const filename = searchParams.get('filename') || 'pstream-video.mp4';
  const tokenCode = searchParams.get('token');

  if (!videoUrl) {
    return NextResponse.json(
      { success: false, error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  // ─── Token validation for ALL requests (cached) ────────────────
  if (!tokenCode) {
    return NextResponse.json(
      { success: false, error: 'Access token required. Please log in to stream.' },
      { status: 401 }
    );
  }

  const tokenResult = await validateToken(tokenCode);

  if (!tokenResult.valid) {
    return NextResponse.json(
      { success: false, error: tokenResult.error },
      { status: tokenResult.status }
    );
  }

  // Download mode: additionally validate tier
  if (isDownload) {
    if (tokenResult.tier !== 'download') {
      return NextResponse.json(
        { success: false, error: 'Your plan does not support downloads. Upgrade to Stream + Download.' },
        { status: 403 }
      );
    }
  }

  // Validate the URL is from an allowed host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid url parameter' },
      { status: 400 }
    );
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
  );

  if (!isAllowed) {
    return NextResponse.json(
      { success: false, error: 'Domain not allowed for proxying' },
      { status: 403 }
    );
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { success: false, error: 'Only http/https URLs are allowed' },
      { status: 400 }
    );
  }

  try {
    // Forward the Range header if present (for video seeking)
    const rangeHeader = request.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: '*/*',
      'Accept-Encoding': 'identity', // Don't let CDN compress video — binary must stream as-is
      Connection: 'keep-alive',
    };

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    // Fetch with proper timeout handling — use AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout — some CDNs are slow for large ranges on 3G

    const res = await fetch(videoUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
      // @ts-expect-error — Next.js extends fetch with caching options
      cache: 'no-store',
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok && res.status !== 206 && res.status !== 304) {
      return NextResponse.json(
        { success: false, error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    // Build response headers
    const responseHeaders = new Headers();

    // Forward Content-Type
    const contentType = res.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    } else {
      responseHeaders.set('Content-Type', 'video/mp4');
    }

    // Forward Content-Length
    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    // Forward Content-Range for partial responses
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // Accept-Ranges header enables seeking
    responseHeaders.set('Accept-Ranges', 'bytes');

    // CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Cache-Control');

    // Download mode: add Content-Disposition to trigger browser download
    if (isDownload) {
      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      responseHeaders.set('Content-Disposition', `attachment; filename="${sanitized}"`);
      responseHeaders.set('Cache-Control', 'no-store');
    } else {
      // Streaming mode: aggressive browser caching to reduce proxy round-trips.
      // The main cause of streaming hiccups is the double-hop latency:
      // CDN → Vercel → Browser. By telling the browser to cache video chunks
      // longer, we eliminate most re-fetches on seek and buffer refill.
      // 'no-transform' prevents Vercel edge from modifying the response.
      // Trade-off: revoked tokens lose access within max-age (3600s) at most.
      responseHeaders.set('Cache-Control', 'private, max-age=3600, must-revalidate, no-transform');
    }

    if (res.status === 206 || rangeHeader) {
      return new NextResponse(res.body, {
        status: 206,
        headers: responseHeaders,
      });
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'CDN request timed out. Please try again.' },
        { status: 504 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PStream Video Proxy] Error:', message);
    return NextResponse.json(
      { success: false, error: `Video proxy error: ${message}` },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Access-Control-Max-Age': '86400',
    },
  });
}
