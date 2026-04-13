import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fingerprint, deviceInfo } = body;

    // Validate required fields
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      );
    }

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Device fingerprint is required' },
        { status: 400 }
      );
    }

    // Look up code (case-insensitive)
    const normalizedCode = code.trim().toUpperCase();
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 404 }
      );
    }

    // Check status
    if (accessCode.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'This code has been revoked. Contact admin.' },
        { status: 403 }
      );
    }

    if (accessCode.status === 'expired') {
      return NextResponse.json(
        { success: false, error: 'This code has expired' },
        { status: 410 }
      );
    }

    // If already active, check device match
    if (accessCode.status === 'active' && accessCode.redeemedByDeviceId) {
      // Find device by fingerprint to compare
      const device = await prisma.device.findUnique({
        where: { fingerprint },
      });

      if (device && device.id === accessCode.redeemedByDeviceId) {
        // Same device — idempotent re-login, check if expired
        const now = new Date();
        if (accessCode.expiresAt && accessCode.expiresAt < now) {
          // Mark as expired
          await prisma.accessCode.update({
            where: { id: accessCode.id },
            data: { status: 'expired' },
          });
          return NextResponse.json(
            { success: false, error: 'This code has expired' },
            { status: 410 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            tier: accessCode.tier,
            expiresAt: accessCode.expiresAt?.toISOString(),
            code: accessCode.code,
            planDurationDays: accessCode.planDurationDays,
            maxDownloads: accessCode.maxDownloads,
          },
        });
      }

      // Different device
      return NextResponse.json(
        { success: false, error: 'This code is already used on another device' },
        { status: 403 }
      );
    }

    // Status is "available" — redeem the code
    // Create or find device
    const device = await prisma.device.upsert({
      where: { fingerprint },
      update: {
        lastActiveAt: new Date(),
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
      },
      create: {
        fingerprint,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : JSON.stringify({ unknown: true }),
      },
    });

    // Calculate expiration
    const expiresAt = new Date();
    if (accessCode.tier === 'trial') {
      // For trial tokens, use trial duration from config
      const config = await prisma.adminConfig.findUnique({ where: { id: 'main' } });
      const trialHours = config?.trialDurationHours ?? 1;
      expiresAt.setHours(expiresAt.getHours() + trialHours);
    } else {
      expiresAt.setDate(expiresAt.getDate() + accessCode.planDurationDays);
    }

    // Update the access code
    const updatedCode = await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: {
        status: 'active',
        redeemedAt: new Date(),
        expiresAt,
        redeemedByDeviceId: device.id,
        redeemedDeviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tier: updatedCode.tier,
        expiresAt: updatedCode.expiresAt?.toISOString(),
        code: updatedCode.code,
        planDurationDays: updatedCode.planDurationDays,
        maxDownloads: updatedCode.maxDownloads,
      },
    });
  } catch (error) {
    console.error('Token redeem error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
