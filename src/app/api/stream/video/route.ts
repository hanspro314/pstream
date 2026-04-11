/* Video Proxy — streams CDN video to the browser, bypassing hotlink / CORS / referer restrictions */

import { NextRequest, NextResponse } from 'next/server';

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

  if (!videoUrl) {
    return NextResponse.json(
      { success: false, error: 'Missing url parameter' },
      { status: 400 }
    );
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
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    // Cache control — allow browser to cache video segments
    responseHeaders.set('Cache-Control', 'public, max-age=86400');

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
