import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Remove from the translation data
    await kv.del(key);

    // Remove from history sorted set
    await kv.zrem('translation:history', key);

    // Remove from favorites if it was favorited
    await kv.zrem('translation:favorites', key);

    // Remove SRS data if exists
    await kv.del(`srs:${key}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
