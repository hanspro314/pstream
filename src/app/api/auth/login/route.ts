/* PStream Login API */
/* Authenticates user with phone/email + password or OTP-based login */

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
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${str.length}`;
}

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

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/auth/login ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, password, sendOtp } = body;

    if (!phone && !email) {
      return NextResponse.json(
        { success: false, error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    // OTP-based login (no password needed)
    if (sendOtp) {
      const normalizedPhone = phone ? normalizePhone(phone) : '';
      const targetPhone = normalizedPhone || '';

      // Check if user exists by phone
      let user: MockUser | undefined;
      if (targetPhone) {
        user = mockUsers.get(targetPhone);
      }

      // Check by email if no phone match
      if (!user && email) {
        for (const [, u] of mockUsers) {
          if (u.email.toLowerCase() === email.toLowerCase()) {
            user = u;
            break;
          }
        }
      }

      // Generate OTP even if user doesn't exist (verify-otp will create account)
      const otp = generateOtp();
      const expiry = Date.now() + 5 * 60 * 1000;

      mockOtps.set(targetPhone, {
        code: otp,
        phone: targetPhone,
        purpose: 'login',
        expiresAt: expiry,
        userId: user?.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          message: `OTP sent to ${targetPhone || email}`,
          otpExpiry: expiry,
          otp, // Mock only
          requiresOtp: true,
        },
      });
    }

    // Password-based login
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const hashedPassword = simpleHash(password);
    let user: MockUser | undefined;

    // Find by phone
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      user = mockUsers.get(normalizedPhone);
    }

    // Find by email if no phone match
    if (!user && email) {
      for (const [, u] of mockUsers) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number or email' },
        { status: 404 }
      );
    }

    if (user.passwordHash && user.passwordHash !== hashedPassword) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Create session
    const token = generateToken(user.id);
    const sessionExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    mockSessions.set(token, {
      userId: user.id,
      expiresAt: sessionExpiry,
    });

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
          isVerified: user.isVerified,
          freeTrialActive: true,
          freeTrialExpiry,
          subscriptionExpiry: 0,
          plan: 'free' as const,
          createdAt: user.createdAt,
          lastLogin: Date.now(),
        },
        token,
        message: 'Login successful!',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
