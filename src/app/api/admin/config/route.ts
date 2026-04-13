import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let config = await prisma.adminConfig.findUnique({
      where: { id: 'main' },
    });

    // Create default config if it doesn't exist
    if (!config) {
      config = await prisma.adminConfig.create({
        data: { id: 'main' },
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin config GET error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    return NextResponse.json(
      { success: false, error: 'Internal server error', debug: msg, stack },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const config = await prisma.adminConfig.upsert({
      where: { id: 'main' },
      update: {
        ...(body.siteName !== undefined && { siteName: body.siteName }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.streamPrice !== undefined && { streamPrice: Number(body.streamPrice) }),
        ...(body.downloadPrice !== undefined && { downloadPrice: Number(body.downloadPrice) }),
        ...(body.planDurationDays !== undefined && { planDurationDays: Number(body.planDurationDays) }),
        ...(body.trialEnabled !== undefined && { trialEnabled: Boolean(body.trialEnabled) }),
        ...(body.trialDurationHours !== undefined && { trialDurationHours: Number(body.trialDurationHours) }),
        ...(body.maxDownloadsPerPeriod !== undefined && { maxDownloadsPerPeriod: Number(body.maxDownloadsPerPeriod) }),
        ...(body.tokenPrefix !== undefined && { tokenPrefix: String(body.tokenPrefix) }),
        ...(body.tokenLength !== undefined && { tokenLength: Number(body.tokenLength) }),
        ...(body.defaultRefundPolicy !== undefined && { defaultRefundPolicy: body.defaultRefundPolicy }),
        ...(body.defaultRefundPercent !== undefined && { defaultRefundPercent: Number(body.defaultRefundPercent) }),
        ...(body.allowDeviceTransfer !== undefined && { allowDeviceTransfer: Boolean(body.allowDeviceTransfer) }),
        ...(body.maxDevicesPerToken !== undefined && { maxDevicesPerToken: Number(body.maxDevicesPerToken) }),
      },
      create: {
        id: 'main',
        ...(body.siteName !== undefined && { siteName: body.siteName }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.streamPrice !== undefined && { streamPrice: Number(body.streamPrice) }),
        ...(body.downloadPrice !== undefined && { downloadPrice: Number(body.downloadPrice) }),
        ...(body.planDurationDays !== undefined && { planDurationDays: Number(body.planDurationDays) }),
        ...(body.trialEnabled !== undefined && { trialEnabled: Boolean(body.trialEnabled) }),
        ...(body.trialDurationHours !== undefined && { trialDurationHours: Number(body.trialDurationHours) }),
        ...(body.maxDownloadsPerPeriod !== undefined && { maxDownloadsPerPeriod: Number(body.maxDownloadsPerPeriod) }),
        ...(body.tokenPrefix !== undefined && { tokenPrefix: String(body.tokenPrefix) }),
        ...(body.tokenLength !== undefined && { tokenLength: Number(body.tokenLength) }),
        ...(body.defaultRefundPolicy !== undefined && { defaultRefundPolicy: body.defaultRefundPolicy }),
        ...(body.defaultRefundPercent !== undefined && { defaultRefundPercent: Number(body.defaultRefundPercent) }),
        ...(body.allowDeviceTransfer !== undefined && { allowDeviceTransfer: Boolean(body.allowDeviceTransfer) }),
        ...(body.maxDevicesPerToken !== undefined && { maxDevicesPerToken: Number(body.maxDevicesPerToken) }),
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin config PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
