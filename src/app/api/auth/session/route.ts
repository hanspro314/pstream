/* PStream Session Check API */
/* Validates session token and returns user data */

import { NextRequest, NextResponse } from 'next/server';

// ─── Access shared mock database ─────────────────────────────────
interface MockUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  avatar: string;
  isVerified: boolean;
  createdAt: number;
}

interface SessionData {
  userId: string;
  expiresAt: number;
}

const globalForDb = globalThis as unknown as {
  __mockUsers?: Map<string, MockUser>;
  __mockSessions?: Map<string, SessionData>;
};

const mockUsers = globalForDb.__mockUsers || new Map<string, MockUser>();
const mockSessions = globalForDb.__mockSessions || new Map<string, SessionData>();

// ─── POST /api/auth/session ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Session token is required' },
        { status: 401 }
      );
    }

    const session = mockSessions.get(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      mockSessions.delete(token);
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Find user
    let user: MockUser | undefined;
    for (const [, u] of mockUsers) {
      if (u.id === session.userId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar || '',
          isSubscribed: false,
          isVerified: user.isVerified,
          freeTrialActive: false,
          freeTrialExpiry: 0,
          subscriptionExpiry: 0,
          plan: 'free' as const,
          createdAt: user.createdAt,
          lastLogin: Date.now(),
        },
        valid: true,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
