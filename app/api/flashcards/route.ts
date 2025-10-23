import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// SM-2 Algorithm for spaced repetition
// Based on SuperMemo 2 algorithm used by Anki
function calculateNextReview(quality: number, repetitions: number, easeFactor: number, interval: number) {
  // quality: 0-5 (0=total blackout, 5=perfect response)
  // repetitions: number of consecutive correct responses
  // easeFactor: how easy the card is (starts at 2.5)
  // interval: current interval in days

  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let newInterval = interval;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - start over
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Minimum ease factor is 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    interval: newInterval,
    nextReview: nextReviewDate.getTime(),
  };
}

// GET - Get cards due for review
export async function GET() {
  try {
    const favoriteKeys = await kv.zrange('translation:favorites', 0, -1);

    if (!favoriteKeys || favoriteKeys.length === 0) {
      return NextResponse.json({ flashcards: [] });
    }

    const now = Date.now();
    const flashcards = [];

    for (const key of favoriteKeys) {
      const translation = await kv.get(String(key));
      if (!translation) continue;

      // Get SRS data
      const srsKey = `srs:${key}`;
      let srsData = await kv.get(srsKey) as any;

      if (!srsData) {
        // Initialize SRS data for new flashcard
        srsData = {
          easeFactor: 2.5,
          repetitions: 0,
          interval: 0,
          nextReview: now,
          lastReview: null,
        };
      }

      // Check if card is due for review
      if (srsData.nextReview <= now) {
        flashcards.push({
          key,
          ...translation,
          srs: srsData,
        });
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Flashcard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards', flashcards: [] },
      { status: 500 }
    );
  }
}

// POST - Submit review result
export async function POST(request: NextRequest) {
  try {
    const { key, quality } = await request.json();

    if (!key || quality === undefined) {
      return NextResponse.json(
        { error: 'Key and quality are required' },
        { status: 400 }
      );
    }

    if (quality < 0 || quality > 5) {
      return NextResponse.json(
        { error: 'Quality must be between 0 and 5' },
        { status: 400 }
      );
    }

    const srsKey = `srs:${key}`;
    let srsData = await kv.get(srsKey) as any;

    if (!srsData) {
      srsData = {
        easeFactor: 2.5,
        repetitions: 0,
        interval: 0,
        nextReview: Date.now(),
        lastReview: null,
      };
    }

    // Calculate next review using SM-2 algorithm
    const newSrsData = calculateNextReview(
      quality,
      srsData.repetitions,
      srsData.easeFactor,
      srsData.interval
    );

    // Update SRS data
    await kv.set(srsKey, {
      ...newSrsData,
      lastReview: Date.now(),
    }, {
      ex: 60 * 60 * 24 * 365, // 1 year expiry for SRS data
    });

    return NextResponse.json({
      success: true,
      nextReview: new Date(newSrsData.nextReview).toISOString(),
      interval: newSrsData.interval,
    });
  } catch (error) {
    console.error('Flashcard review error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
