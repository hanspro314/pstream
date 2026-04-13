import { NextRequest, NextResponse } from 'next/server';
import { findAccessCode, updateAccessCode, getAdminConfig, deleteAccessCode } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await findAccessCode({ code: id });
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }
    await deleteAccessCode(id);
    return NextResponse.json({ success: true, message: 'Token deleted' });
  } catch (error) {
    console.error('Admin token DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

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

    // The [id] route param is actually the token CODE (not DB id)
    const token = await findAccessCode({ code: id });
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
          revokedAt: new Date().toISOString(),
          revokeReason: reason || null,
        };
        if (Number(token.pricePaid) > 0) {
          const config = await getAdminConfig();
          const policy = refundPolicy || config?.defaultRefundPolicy || 'none';
          if (policy === 'full') {
            updateData.refunded = 1;
            updateData.refundAmount = Number(token.pricePaid);
          } else if (policy === 'partial') {
            const percent = Number(config?.defaultRefundPercent) || 50;
            updateData.refunded = 1;
            updateData.refundAmount = Math.floor(Number(token.pricePaid) * percent / 100);
          } else if (refundAmount !== undefined && Number(refundAmount) > 0) {
            updateData.refunded = 1;
            updateData.refundAmount = Number(refundAmount);
          }
        }
        break;
      }
      case 'expire': {
        updateData = { status: 'expired', expiresAt: new Date().toISOString() };
        break;
      }
      case 'reactivate': {
        if (token.status !== 'revoked' && token.status !== 'expired') {
          return NextResponse.json(
            { success: false, error: 'Only revoked or expired tokens can be reactivated' },
            { status: 400 }
          );
        }
        const days = Number(token.planDurationDays) || 14;
        const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        updateData = {
          status: 'active',
          revokedAt: null,
          revokeReason: null,
          expiresAt: newExpiry.toISOString(),
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

    const updated = await updateAccessCode({ code: id }, updateData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Admin token PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
