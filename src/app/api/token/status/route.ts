import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const fingerprint = searchParams.get('fingerprint');

    if (!code || !fingerprint) {
      return NextResponse.json(
        { success: false, error: 'Both code and fingerprint query params are required' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!accessCode) {
      return NextResponse.json(
        { success: true, data: { valid: false, reason: 'not_found' } },
      );
    }

    // Check if revoked
    if (accessCode.status === 'revoked') {
      return NextResponse.json({
        success: true,
        data: { valid: false, reason: 'revoked' },
      });
    }

    // Check if expired
    if (accessCode.status === 'expired' || (accessCode.expiresAt && accessCode.expiresAt < new Date())) {
      // Auto-update status if not already expired
      if (accessCode.status !== 'expired') {
        await prisma.accessCode.update({
          where: { id: accessCode.id },
          data: { status: 'expired' },
        });
      }
      return NextResponse.json({
        success: true,
        data: { valid: false, reason: 'expired' },
      });
    }

    // Check if code is available (not yet redeemed)
    if (accessCode.status === 'available') {
      return NextResponse.json({
        success: true,
        data: { valid: false, reason: 'not_redeemed' },
      });
    }

    // Code is active — check device match
    if (accessCode.redeemedByDeviceId) {
      const device = await prisma.device.findUnique({
        where: { fingerprint },
      });

      if (!device || device.id !== accessCode.redeemedByDeviceId) {
        return NextResponse.json({
          success: true,
          data: { valid: false, reason: 'device_mismatch' },
        });
      }
    }

    // Calculate days remaining
    const now = new Date();
    const expiresAt = accessCode.expiresAt ?? new Date();
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const canDownload = accessCode.tier === 'download' && (accessCode.maxDownloads === 0 || accessCode.maxDownloads > 0);

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        tier: accessCode.tier,
        expiresAt: accessCode.expiresAt?.toISOString(),
        daysRemaining,
        maxDownloads: accessCode.maxDownloads,
        canDownload,
      },
    });
  } catch (error) {
    console.error('Token status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
