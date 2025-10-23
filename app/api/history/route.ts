import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Get last 50 translation keys from sorted set
    const historyKeys = await kv.zrange('translation:history', -50, -1, {
      rev: true,
    });

    if (!historyKeys || historyKeys.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Fetch all translation data
    const translations = await Promise.all(
      historyKeys.map(async (key) => {
        const data = await kv.get(String(key));
        return data;
      })
    );

    const history = translations.filter(Boolean);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', history: [] },
      { status: 500 }
    );
  }
}
