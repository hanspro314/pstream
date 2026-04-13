import { NextResponse } from 'next/server';
import { findManyAccessCodes, countAccessCodes, getAdminConfig, findAccessCode, createManyAccessCodes } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = status && status !== 'all' ? { status } : {};

    const [tokens, total] = await Promise.all([
      findManyAccessCodes({ where, orderBy: 'createdAt DESC', skip, take: limit }),
      countAccessCodes(where),
    ]);

    return NextResponse.json({
      success: true,
      data: { tokens, total, page },
    });
  } catch (error) {
    console.error('Admin tokens GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 1, tier, note } = body;

    if (!tier || !['stream', 'download', 'trial'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be "stream", "download", or "trial"' },
        { status: 400 }
      );
    }

    const numCount = Math.min(100, Math.max(1, Number(count) || 1));

    let config = await getAdminConfig();
    if (!config) {
      config = await (await import('@/lib/db')).createDefaultConfig();
    }

    let planDurationDays = Number(config.planDurationDays) || 14;
    let maxDownloads = Number(config.maxDownloadsPerPeriod) || 0;
    let pricePaid = 0;

    if (tier === 'trial') {
      planDurationDays = Math.ceil((Number(config.trialDurationHours) || 1) / 24);
      maxDownloads = 0;
      pricePaid = 0;
    } else if (tier === 'stream') {
      pricePaid = Number(config.streamPrice) || 2000;
      maxDownloads = 0;
    } else if (tier === 'download') {
      pricePaid = Number(config.downloadPrice) || 3500;
      maxDownloads = Number(config.maxDownloadsPerPeriod) || 0;
    }

    const tokenPrefix = String(config.tokenPrefix || 'PS-');
    const tokenLength = Number(config.tokenLength) || 6;
    const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: { code: string; tier: string; planDurationDays: number; maxDownloads: number; pricePaid: number; note: string | null }[] = [];
    const existingCodes = new Set<string>();
    let attempts = 0;
    const maxAttempts = numCount * 10;

    while (codes.length < numCount && attempts < maxAttempts) {
      attempts++;
      let code = tokenPrefix;
      for (let i = 0; i < tokenLength; i++) {
        code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
      }
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        const exists = await findAccessCode({ code });
        if (!exists) {
          codes.push({ code, tier, planDurationDays, maxDownloads, pricePaid, note: note || null });
        }
      }
    }

    if (codes.length < numCount) {
      return NextResponse.json(
        { success: false, error: `Could only generate ${codes.length} of ${numCount} unique codes. Try again.` },
        { status: 409 }
      );
    }

    const created = await createManyAccessCodes(codes);
    const createdCodes = await findManyAccessCodes({
      where: { code: { in: codes.map(c => c.code) } },
      orderBy: 'createdAt DESC',
    });

    return NextResponse.json({
      success: true,
      data: { codes: createdCodes, count: created.count },
    });
  } catch (error) {
    console.error('Admin tokens POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
