/* Shared token validation helper for API routes.
 *
 * Every protected API route calls this before returning data.
 * It checks: token exists, not revoked, not expired, is active.
 * Returns { valid: false, status, error } on failure so routes can
 * respond with the correct HTTP status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findAccessCode } from './db';

export interface TokenValidation {
  valid: true;
  code: string;
  tier: string;
}

export interface TokenInvalid {
  valid: false;
  response: NextResponse;
}

export type TokenCheck = TokenValidation | TokenInvalid;

export async function validateRequestToken(request: NextRequest): Promise<TokenCheck> {
  const { searchParams } = new URL(request.url);
  const tokenCode = searchParams.get('token');

  if (!tokenCode) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Access token required. Please log in.' },
        { status: 401 },
      ),
    };
  }

  const accessCode = await findAccessCode({ code: tokenCode.trim().toUpperCase() });

  if (!accessCode) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid access token.' },
        { status: 403 },
      ),
    };
  }

  if (accessCode.status === 'revoked') {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Access token has been deactivated.' },
        { status: 403 },
      ),
    };
  }

  if (accessCode.status === 'expired' || (accessCode.expiresAt && new Date(String(accessCode.expiresAt)) < new Date())) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Access token has expired.' },
        { status: 403 },
      ),
    };
  }

  if (accessCode.status !== 'active') {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Access token is not active.' },
        { status: 403 },
      ),
    };
  }

  return {
    valid: true,
    code: String(accessCode.code),
    tier: String(accessCode.tier),
  };
}
