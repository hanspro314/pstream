import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 to avoid confusion

function generateRandomCode(prefix: string, length: number): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[array[i] % ALPHANUMERIC.length];
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const skip = (page - 1) * limit;

    const where = status && status !== 'all' ? { status } : {};

    const [tokens, total] = await Promise.all([
      prisma.accessCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.accessCode.count({ where }),
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

    // Validate tier
    if (!tier || !['stream', 'download', 'trial'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be "stream", "download", or "trial"' },
        { status: 400 }
      );
    }

    // Validate count
    const numCount = Math.min(100, Math.max(1, Number(count) || 1));

    // Get admin config for settings
    let config = await prisma.adminConfig.findUnique({ where: { id: 'main' } });
    if (!config) {
      config = await prisma.adminConfig.create({ data: { id: 'main' } });
    }

    // Determine plan settings based on tier
    let planDurationDays = config.planDurationDays;
    let maxDownloads = config.maxDownloadsPerPeriod;
    let pricePaid = 0;

    if (tier === 'trial') {
      // Trial uses hours, but we store a fraction of a day
      planDurationDays = Math.ceil((config.trialDurationHours ?? 1) / 24);
      maxDownloads = 0;
      pricePaid = 0;
    } else if (tier === 'stream') {
      pricePaid = config.streamPrice;
      maxDownloads = 0; // No downloads for stream tier
    } else if (tier === 'download') {
      pricePaid = config.downloadPrice;
      maxDownloads = config.maxDownloadsPerPeriod;
    }

    // Generate unique codes
    const codes: string[] = [];
    const existingCodes = new Set<string>();
    let attempts = 0;
    const maxAttempts = numCount * 10;

    while (codes.length < numCount && attempts < maxAttempts) {
      attempts++;
      const code = generateRandomCode(config.tokenPrefix, config.tokenLength);
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        // Check DB for uniqueness
        const exists = await prisma.accessCode.findUnique({ where: { code } });
        if (!exists) {
          codes.push(code);
        }
      }
    }

    if (codes.length < numCount) {
      return NextResponse.json(
        { success: false, error: `Could only generate ${codes.length} of ${numCount} unique codes. Try again.` },
        { status: 409 }
      );
    }

    // Create all access codes
    const created = await prisma.accessCode.createMany({
      data: codes.map((code) => ({
        code,
        tier,
        status: 'available',
        planDurationDays,
        maxDownloads,
        pricePaid,
        note: note || null,
      })),
    });

    // Fetch the created codes for the response
    const createdCodes = await prisma.accessCode.findMany({
      where: { code: { in: codes } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        codes: createdCodes,
        count: created.count,
      },
    });
  } catch (error) {
    console.error('Admin tokens POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
