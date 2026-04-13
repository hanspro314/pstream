/* Admin PIN Verification — gate access to the admin dashboard */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      );
    }

    const adminPin = process.env.PSTREAM_ADMIN_PIN;

    if (!adminPin) {
      return NextResponse.json(
        { success: false, error: 'Admin PIN not configured on server' },
        { status: 500 }
      );
    }

    // Simple string comparison — PIN is short, so timing attacks are not a real concern here
    if (pin === adminPin) {
      return NextResponse.json({
        success: true,
        data: { verified: true },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Incorrect PIN' },
      { status: 403 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
