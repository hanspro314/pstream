import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();

    // Start of today (UTC)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 7 days ago
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    // Get all tokens with counts by status
    const [
      totalTokens,
      activeTokens,
      availableTokens,
      revokedTokens,
      expiredTokens,
      streamCount,
      downloadCount,
      trialCount,
      totalDevices,
      allTokens,
      recentActivations,
    ] = await Promise.all([
      prisma.accessCode.count(),
      prisma.accessCode.count({ where: { status: 'active' } }),
      prisma.accessCode.count({ where: { status: 'available' } }),
      prisma.accessCode.count({ where: { status: 'revoked' } }),
      prisma.accessCode.count({ where: { status: 'expired' } }),
      prisma.accessCode.count({ where: { tier: 'stream' } }),
      prisma.accessCode.count({ where: { tier: 'download' } }),
      prisma.accessCode.count({ where: { tier: 'trial' } }),
      prisma.device.count(),
      prisma.accessCode.findMany({
        where: { pricePaid: { gt: 0 } },
        select: { pricePaid: true, redeemedAt: true },
      }),
      // Last 10 activations with device info
      prisma.accessCode.findMany({
        where: {
          status: 'active',
          redeemedAt: { not: null },
        },
        orderBy: { redeemedAt: 'desc' },
        take: 10,
        select: {
          code: true,
          tier: true,
          redeemedDeviceInfo: true,
          redeemedAt: true,
        },
      }),
    ]);

    // Calculate revenue totals
    let totalRevenue = 0;
    let revenueThisWeek = 0;
    let revenueToday = 0;

    const dailyRevenueMap: Record<string, number> = {};

    for (const token of allTokens) {
      totalRevenue += token.pricePaid;

      if (token.redeemedAt) {
        const redeemedDate = new Date(token.redeemedAt);

        if (redeemedDate >= startOfWeek) {
          revenueThisWeek += token.pricePaid;
        }

        if (redeemedDate >= startOfDay) {
          revenueToday += token.pricePaid;
        }

        // Daily revenue for the last 7 days
        if (redeemedDate >= startOfWeek) {
          const dateKey = redeemedDate.toISOString().split('T')[0];
          dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + token.pricePaid;
        }
      }
    }

    // Build daily revenue array (fill missing days with 0)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyRevenue.push({
        date: dateKey,
        amount: dailyRevenueMap[dateKey] || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalTokens,
        activeTokens,
        availableTokens,
        revokedTokens,
        expiredTokens,
        totalRevenue,
        revenueThisWeek,
        revenueToday,
        totalDevices,
        streamCount,
        downloadCount,
        trialCount,
        recentActivations,
        dailyRevenue,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
