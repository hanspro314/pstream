import { NextRequest, NextResponse } from 'next/server';
import { getAdminConfig, createDefaultConfig, upsertAdminConfig } from '@/lib/db';

export async function GET() {
  try {
    let config = await getAdminConfig();

    if (!config) {
      config = await createDefaultConfig();
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin config GET error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.siteName !== undefined) data.siteName = String(body.siteName);
    if (body.whatsapp !== undefined) data.whatsapp = String(body.whatsapp);
    if (body.currency !== undefined) data.currency = String(body.currency);
    if (body.streamPrice !== undefined) data.streamPrice = Number(body.streamPrice);
    if (body.downloadPrice !== undefined) data.downloadPrice = Number(body.downloadPrice);
    if (body.planDurationDays !== undefined) data.planDurationDays = Number(body.planDurationDays);
    if (body.trialEnabled !== undefined) data.trialEnabled = Boolean(body.trialEnabled) ? 1 : 0;
    if (body.trialDurationHours !== undefined) data.trialDurationHours = Number(body.trialDurationHours);
    if (body.maxDownloadsPerPeriod !== undefined) data.maxDownloadsPerPeriod = Number(body.maxDownloadsPerPeriod);
    if (body.tokenPrefix !== undefined) data.tokenPrefix = String(body.tokenPrefix);
    if (body.tokenLength !== undefined) data.tokenLength = Number(body.tokenLength);
    if (body.defaultRefundPolicy !== undefined) data.defaultRefundPolicy = String(body.defaultRefundPolicy);
    if (body.defaultRefundPercent !== undefined) data.defaultRefundPercent = Number(body.defaultRefundPercent);
    if (body.allowDeviceTransfer !== undefined) data.allowDeviceTransfer = Boolean(body.allowDeviceTransfer) ? 1 : 0;
    if (body.maxDevicesPerToken !== undefined) data.maxDevicesPerToken = Number(body.maxDevicesPerToken);

    const config = await upsertAdminConfig(data);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin config PUT error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
