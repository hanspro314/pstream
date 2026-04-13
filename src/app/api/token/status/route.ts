import { NextRequest, NextResponse } from 'next/server';
import { findAccessCode, updateAccessCode, findDevice } from '@/lib/db';

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
    const accessCode = await findAccessCode({ code: normalizedCode });

    if (!accessCode) {
      return NextResponse.json({ success: true, data: { valid: false, reason: 'not_found' } });
    }
    if (accessCode.status === 'revoked') {
      return NextResponse.json({ success: true, data: { valid: false, reason: 'revoked' } });
    }
    if (accessCode.status === 'expired' || (accessCode.expiresAt && new Date(String(accessCode.expiresAt)) < new Date())) {
      if (accessCode.status !== 'expired') {
        await updateAccessCode({ code: accessCode.code }, { status: 'expired' });
      }
      return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } });
    }
    if (accessCode.status === 'available') {
      return NextResponse.json({ success: true, data: { valid: false, reason: 'not_redeemed' } });
    }

    if (accessCode.redeemedByDeviceId) {
      const device = await findDevice({ fingerprint });
      if (!device || device.id !== accessCode.redeemedByDeviceId) {
        return NextResponse.json({ success: true, data: { valid: false, reason: 'device_mismatch' } });
      }
    }

    const expiresAt = accessCode.expiresAt ? new Date(String(accessCode.expiresAt)) : new Date();
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const canDownload = accessCode.tier === 'download';

    return NextResponse.json({
      success: true,
      data: { valid: true, tier: accessCode.tier, expiresAt: accessCode.expiresAt, daysRemaining, maxDownloads: accessCode.maxDownloads, canDownload },
    });
  } catch (error) {
    console.error('Token status error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
