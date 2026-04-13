import { NextResponse } from 'next/server';
import { findManyAccessCodes, countAccessCodes } from '@/lib/db';

export async function GET() {
  try {
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
      paidTokens,
      recentActivations,
    ] = await Promise.all([
      countAccessCodes(),
      countAccessCodes({ status: 'active' }),
      countAccessCodes({ status: 'available' }),
      countAccessCodes({ status: 'revoked' }),
      countAccessCodes({ status: 'expired' }),
      countAccessCodes({ tier: 'stream' }),
      countAccessCodes({ tier: 'download' }),
      countAccessCodes({ tier: 'trial' }),
      (await import('@/lib/db')).countDevices(),
      findManyAccessCodes({ where: { pricePaid: { gt: 0 } } }),
      findManyAccessCodes({
        where: { status: 'active' },
        orderBy: 'redeemedAt DESC',
        take: 10,
      }),
    ]);

    // Calculate revenue
    let totalRevenue = 0;
    let revenueThisWeek = 0;
    let revenueToday = 0;
    const dailyRevenueMap: Record<string, number> = {};

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    for (const token of paidTokens) {
      const paid = Number(token.pricePaid) || 0;
      totalRevenue += paid;
      if (token.redeemedAt) {
        const d = new Date(String(token.redeemedAt));
        if (d >= startOfWeek) revenueThisWeek += paid;
        if (d >= startOfDay) revenueToday += paid;
        if (d >= startOfWeek) {
          const dateKey = d.toISOString().split('T')[0];
          dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + paid;
        }
      }
    }

    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyRevenue.push({ date: dateKey, amount: dailyRevenueMap[dateKey] || 0 });
    }

    // Filter recent activations to only those with redeemedAt
    const recent = recentActivations.filter(t => t.redeemedAt !== null);

    return NextResponse.json({
      success: true,
      data: {
        totalTokens, activeTokens, availableTokens, revokedTokens, expiredTokens,
        totalRevenue, revenueThisWeek, revenueToday, totalDevices,
        streamCount, downloadCount, trialCount,
        recentActivations: recent, dailyRevenue,
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
