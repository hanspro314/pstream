import { NextRequest, NextResponse } from 'next/server';
import { countAccessCodes, deleteManyAccessCodes } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status } = body; // 'all' or 'available'

    const before = await countAccessCodes({});

    if (status === 'available') {
      await deleteManyAccessCodes({ status: 'available' });
    } else if (status === 'all') {
      await deleteManyAccessCodes();
    } else {
      return NextResponse.json({ success: false, error: 'Specify status as "all" or "available"' }, { status: 400 });
    }

    const after = await countAccessCodes({});

    return NextResponse.json({ success: true, deleted: before - after, remaining: after });
  } catch (error) {
    console.error('Bulk delete error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
