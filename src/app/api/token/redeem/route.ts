import { NextRequest, NextResponse } from 'next/server';
import { findAccessCode, findDevice, updateAccessCode, upsertDevice, getAdminConfig } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fingerprint, deviceInfo } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Access code is required' }, { status: 400 });
    }
    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ success: false, error: 'Device fingerprint is required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const accessCode = await findAccessCode({ code: normalizedCode });

    if (!accessCode) {
      return NextResponse.json({ success: false, error: 'Invalid access code' }, { status: 404 });
    }
    if (accessCode.status === 'revoked') {
      return NextResponse.json({ success: false, error: 'This code has been revoked. Contact admin.' }, { status: 403 });
    }
    if (accessCode.status === 'expired') {
      return NextResponse.json({ success: false, error: 'This code has expired' }, { status: 410 });
    }

    if (accessCode.status === 'active' && accessCode.redeemedByDeviceId) {
      // Device lock check: compare fingerprint directly (device.id is null in libsql raw queries)
      if (fingerprint === String(accessCode.redeemedByDeviceId)) {
        const now = new Date();
        if (accessCode.expiresAt && new Date(String(accessCode.expiresAt)) < now) {
          await updateAccessCode({ code: accessCode.code }, { status: 'expired' });
          return NextResponse.json({ success: false, error: 'This code has expired' }, { status: 410 });
        }
        // Update device lastActiveAt
        await upsertDevice(fingerprint,
          { lastActiveAt: new Date().toISOString(), deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined },
          {}
        );
        return NextResponse.json({
          success: true,
          data: {
            tier: accessCode.tier,
            expiresAt: accessCode.expiresAt ? new Date(String(accessCode.expiresAt)).toISOString() : undefined,
            code: accessCode.code,
            planDurationDays: accessCode.planDurationDays,
            maxDownloads: accessCode.maxDownloads,
          },
        });
      }
      return NextResponse.json({ success: false, error: 'This code is already used on another device' }, { status: 403 });
    }

    // Redeem — create/find device
    const device = await upsertDevice(fingerprint,
      { lastActiveAt: new Date().toISOString(), deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined },
      { fingerprint, deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : JSON.stringify({ unknown: true }) }
    );

    const expiresAt = new Date();
    if (accessCode.tier === 'trial') {
      const config = await getAdminConfig();
      const trialHours = Number(config?.trialDurationHours) || 1;
      expiresAt.setHours(expiresAt.getHours() + trialHours);
    } else {
      expiresAt.setDate(expiresAt.getDate() + (Number(accessCode.planDurationDays) || 14));
    }

    // Store fingerprint as redeemedByDeviceId (not device.id which is null in libsql)
    const updatedCode = await updateAccessCode({ code: accessCode.code }, {
      status: 'active',
      redeemedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      redeemedByDeviceId: fingerprint,
      redeemedDeviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        tier: updatedCode?.tier,
        expiresAt: updatedCode?.expiresAt ? new Date(String(updatedCode.expiresAt)).toISOString() : undefined,
        code: updatedCode?.code,
        planDurationDays: updatedCode?.planDurationDays,
        maxDownloads: updatedCode?.maxDownloads,
      },
    });
  } catch (error) {
    console.error('Token redeem error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
