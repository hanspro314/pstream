/* PStream OTP Verification API */
/* Verifies OTP code and creates session */

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

interface StoredOtp {
  code: string;
  phone: string;
  purpose: 'register' | 'login' | 'reset';
  expiresAt: number;
  userId?: string;
}

interface SessionData {
  userId: string;
  expiresAt: number;
}

const globalForDb = globalThis as unknown as {
  __mockUsers?: Map<string, MockUser>;
  __mockOtps?: Map<string, StoredOtp>;
  __mockSessions?: Map<string, SessionData>;
};

const mockUsers = globalForDb.__mockUsers || new Map<string, MockUser>();
const mockOtps = globalForDb.__mockOtps || new Map<string, StoredOtp>();
const mockSessions = globalForDb.__mockSessions || new Map<string, SessionData>();

// ─── Helpers ─────────────────────────────────────────────────────
function generateToken(userId: string): string {
  const data = `${userId}:${Date.now()}:${Math.random().toString(36)}`;
  return Buffer.from(data).toString('base64url');
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) {
    p = '256' + p.substring(1);
  }
  if (!p.startsWith('256')) {
    p = '256' + p;
  }
  return p;
}

// ─── POST /api/auth/verify-otp ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: 'Phone number and OTP code are required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const storedOtp = mockOtps.get(normalizedPhone);

    if (!storedOtp) {
      return NextResponse.json(
        { success: false, error: 'No OTP found for this number. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > storedOtp.expiresAt) {
      mockOtps.delete(normalizedPhone);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify code
    if (storedOtp.code !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP code. Please try again.' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = mockUsers.get(normalizedPhone);

    if (!user) {
      // User doesn't exist yet — auto-create for OTP login
      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      user = {
        id: userId,
        name: normalizedPhone,
        phone: normalizedPhone,
        email: '',
        passwordHash: '',
        avatar: '',
        isVerified: true,
        createdAt: Date.now(),
      };
      mockUsers.set(normalizedPhone, user);
    } else {
      user.isVerified = true;
      mockUsers.set(normalizedPhone, user);
    }

    // Delete used OTP
    mockOtps.delete(normalizedPhone);

    // Create session
    const token = generateToken(user.id);
    const sessionExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    mockSessions.set(token, {
      userId: user.id,
      expiresAt: sessionExpiry,
    });

    // Build response user object
    const freeTrialExpiry = Date.now() + 24 * 60 * 60 * 1000; // 1 day free trial

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
          isVerified: true,
          freeTrialActive: true,
          freeTrialExpiry,
          subscriptionExpiry: 0,
          plan: 'free' as const,
          createdAt: user.createdAt,
          lastLogin: Date.now(),
        },
        token,
        message: 'Phone verified successfully! Your 1-day free trial has started.',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
