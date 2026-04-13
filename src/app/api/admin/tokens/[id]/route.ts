import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason, refundAmount, refundPolicy } = body;

    if (!action || !['revoke', 'expire', 'reactivate', 'reset_device'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "revoke", "expire", "reactivate", or "reset_device"' },
        { status: 400 }
      );
    }

    // Find the token
    const token = await prisma.accessCode.findUnique({ where: { id } });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'revoke': {
        updateData = {
          status: 'revoked',
          revokedAt: new Date(),
          revokeReason: reason || null,
        };

        // Handle refund
        if (token.pricePaid > 0) {
          const config = await prisma.adminConfig.findUnique({ where: { id: 'main' } });
          const policy = refundPolicy || config?.defaultRefundPolicy || 'none';

          if (policy === 'full') {
            updateData.refunded = true;
            updateData.refundAmount = token.pricePaid;
          } else if (policy === 'partial') {
            const percent = config?.defaultRefundPercent || 50;
            updateData.refunded = true;
            updateData.refundAmount = Math.floor(token.pricePaid * percent / 100);
          } else if (refundAmount !== undefined && refundAmount > 0) {
            updateData.refunded = true;
            updateData.refundAmount = Number(refundAmount);
          }
        }
        break;
      }

      case 'expire': {
        updateData = {
          status: 'expired',
          expiresAt: new Date(),
        };
        break;
      }

      case 'reactivate': {
        if (token.status !== 'revoked' && token.status !== 'expired') {
          return NextResponse.json(
            { success: false, error: 'Only revoked or expired tokens can be reactivated' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'active',
          revokedAt: null,
          revokeReason: null,
          // Restore expiration from plan duration
          expiresAt: new Date(Date.now() + token.planDurationDays * 24 * 60 * 60 * 1000),
        };
        break;
      }

      case 'reset_device': {
        if (token.status !== 'active') {
          return NextResponse.json(
            { success: false, error: 'Only active tokens can have their device reset' },
            { status: 400 }
          );
        }
        // Clear the device lock so the user can re-activate on a new device
        updateData = {
          status: 'available',
          redeemedAt: null,
          redeemedByDeviceId: null,
          redeemedDeviceInfo: null,
          expiresAt: null,
        };
        break;
      }
    }

    const updated = await prisma.accessCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Admin token PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
