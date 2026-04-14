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

  // ─── Token validation for ALL requests ──────────────────────
  // Every stream request requires a valid, active token
  if (!tokenCode) {
    return NextResponse.json(
      { success: false, error: 'Access token required. Please log in to stream.' },
      { status: 401 }
    );
  }
  const accessCode = await findAccessCode({ code: tokenCode.trim().toUpperCase() });
  if (!accessCode) {
    return NextResponse.json(
      { success: false, error: 'Invalid access token.' },
      { status: 403 }
    );
  }
  if (accessCode.status === 'revoked') {
    return NextResponse.json(
      { success: false, error: 'Access token has been deactivated.' },
      { status: 403 }
    );
  }
  if (accessCode.status === 'expired' || (accessCode.expiresAt && new Date(String(accessCode.expiresAt)) < new Date())) {
    return NextResponse.json(
      { success: false, error: 'Access token has expired.' },
      { status: 403 }
    );
  }
  if (accessCode.status !== 'active') {
    return NextResponse.json(
      { success: false, error: 'Access token is not active.' },
      { status: 403 }
    );
  }

  // Download mode: additionally validate tier
  if (isDownload) {
    if (accessCode.tier !== 'download') {
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

    const res = await fetch(videoUrl, {
      headers,
      // Allow redirect following
      redirect: 'follow',
    });

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
      // SECURITY: no-store ensures video cannot be replayed from cache after token revocation.
      // The browser MUST revalidate with our proxy on every request, which checks the token.
      responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      responseHeaders.set('Pragma', 'no-cache');
      responseHeaders.set('Expires', '0');
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
