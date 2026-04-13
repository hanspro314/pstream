/* PStream Registration API */
/* Mock implementation using in-memory storage (no real DB yet) */

import { NextRequest, NextResponse } from 'next/server';

// ─── Mock Database (in-memory, persists during server runtime) ───
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

// Use global to survive HMR in dev
const globalForDb = globalThis as unknown as {
  __mockUsers?: Map<string, MockUser>;
  __mockOtps?: Map<string, StoredOtp>;
  __mockSessions?: Map<string, { userId: string; expiresAt: number }>;
};

if (!globalForDb.__mockUsers) {
  globalForDb.__mockUsers = new Map();
}
if (!globalForDb.__mockOtps) {
  globalForDb.__mockOtps = new Map();
}
if (!globalForDb.__mockSessions) {
  globalForDb.__mockSessions = new Map();
}

const mockUsers = globalForDb.__mockUsers;
const mockOtps = globalForDb.__mockOtps;
const mockSessions = globalForDb.__mockSessions;

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

function generateId(): string {
  return `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

// ─── POST /api/auth/register ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, email, password, otpOnly, purpose } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    // OTP-only mode (for login OTP flow)
    if (otpOnly) {
      const otp = generateOtp();
      const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      mockOtps.set(normalizedPhone, {
        code: otp,
        phone: normalizedPhone,
        purpose: purpose || 'login',
        expiresAt: expiry,
      });

      // In production, send via Africa's Talking / Twilio
      // For mock, return OTP in response so frontend can test
      return NextResponse.json({
        success: true,
        data: {
          message: `OTP sent to ${normalizedPhone}`,
          otpExpiry: expiry,
          ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
        },
      });
    }

    // Full registration
    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: 'Name and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = mockUsers.get(normalizedPhone);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this phone number already exists. Please log in instead.' },
        { status: 409 }
      );
    }

    // Check email uniqueness if provided
    if (email) {
      for (const [, user] of mockUsers) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
          return NextResponse.json(
            { success: false, error: 'An account with this email already exists' },
            { status: 409 }
          );
        }
      }
    }

    // Create user
    const userId = generateId();
    const newUser: MockUser = {
      id: userId,
      name: name.trim(),
      phone: normalizedPhone,
      email: email?.trim() || '',
      passwordHash: simpleHash(password),
      avatar: '',
      isVerified: false,
      createdAt: Date.now(),
    };

    mockUsers.set(normalizedPhone, newUser);

    // Generate OTP
    const otp = generateOtp();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    mockOtps.set(normalizedPhone, {
      code: otp,
      phone: normalizedPhone,
      purpose: 'register',
      expiresAt: expiry,
      userId,
    });

    // In production, send via Africa's Talking / Twilio
    return NextResponse.json({
      success: true,
      data: {
        message: 'Account created successfully. Please verify your phone number.',
        userId,
        otpExpiry: expiry,
        ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
