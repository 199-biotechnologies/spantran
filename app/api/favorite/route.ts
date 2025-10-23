import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const { key, favorite } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Get existing translation
    const translation = await kv.get(key);

    if (!translation) {
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    // Update favorite status
    await kv.set(key, {
      ...translation,
      favorite,
    }, {
      ex: 60 * 60 * 24 * 30, // 30 days expiry
    });

    // Manage favorites sorted set
    if (favorite) {
      await kv.zadd('translation:favorites', {
        score: Date.now(),
        member: key,
      });
    } else {
      await kv.zrem('translation:favorites', key);
    }

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error('Favorite toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite status' },
      { status: 500 }
    );
  }
}
