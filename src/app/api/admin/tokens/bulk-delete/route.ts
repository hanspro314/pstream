import { NextRequest, NextResponse } from 'next/server';
import { countAccessCodes, getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status } = body; // 'all' or 'available'

    let sql: string;
    if (status === 'available') {
      sql = "DELETE FROM AccessCode WHERE status = 'available'";
    } else if (status === 'all') {
      sql = 'DELETE FROM AccessCode';
    } else {
      return NextResponse.json({ success: false, error: 'Specify status as "all" or "available"' }, { status: 400 });
    }

    const before = await countAccessCodes({});
    await getDb().execute({ sql });
    const after = await countAccessCodes({});

    return NextResponse.json({ success: true, deleted: before - after, remaining: after });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
