'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Flashcard {
  key: string;
  original: string;
  translation: string;
  examples: string[];
  fromLang: string;
  toLang: string;
  srs: {
    easeFactor: number;
    repetitions: number;
    interval: number;
    nextReview: number;
    lastReview: number | null;
  };
}

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flashcards');
      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (quality: number) => {
    if (!flashcards[currentIndex]) return;

    setReviewing(true);
    try {
      await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: flashcards[currentIndex].key,
          quality,
        }),
      });

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // All cards reviewed, refresh list
        await fetchFlashcards();
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setReviewing(false);
    }
  };

  const currentCard = flashcards[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-stone-900 mb-4">📚 Flashcards</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
            <p className="text-xl text-stone-700 mb-6">No flashcards due for review!</p>
            <p className="text-stone-600 mb-6">Star translations in your history to add them to your flashcard deck.</p>
            <Link
              href="/"
              className="inline-block bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              ← Back to Translator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-stone-600 hover:text-stone-900 mb-4">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-stone-900 mb-2">📚 Flashcards</h1>
          <p className="text-stone-600">
            {currentIndex + 1} / {flashcards.length}
          </p>
        </div>

        {/* Flashcard */}
        {currentCard && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 mb-4">
            {/* Question Side */}
            <div className="text-center mb-8">
              <p className="text-sm text-stone-500 mb-2">
                {currentCard.fromLang === 'en' ? 'English → Spanish' : 'Spanish → English'}
              </p>
              <p className="text-4xl font-semibold text-stone-900">
                {currentCard.original}
              </p>
            </div>

            {/* Show Answer Button */}
            {!showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                Show Answer
              </button>
            )}

            {/* Answer Side */}
            {showAnswer && (
              <div className="space-y-6">
                <div className="text-center py-6 border-t border-stone-200">
                  <p className="text-3xl font-semibold text-stone-900 mb-4">
                    {currentCard.translation}
                  </p>

                  {/* Examples */}
                  {currentCard.examples && currentCard.examples.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Examples:</p>
                      <div className="space-y-2">
                        {currentCard.examples.map((example, idx) => (
                          <p key={idx} className="text-sm text-stone-700 italic">
                            {example}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => submitReview(0)}
                    disabled={reviewing}
                    className="py-3 px-4 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Again</div>
                    <div className="text-sm">1d</div>
                  </button>
                  <button
                    onClick={() => submitReview(3)}
                    disabled={reviewing}
                    className="py-3 px-4 bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Hard</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * 1.2))}d</div>
                  </button>
                  <button
                    onClick={() => submitReview(4)}
                    disabled={reviewing}
                    className="py-3 px-4 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Good</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * currentCard.srs.easeFactor))}d</div>
                  </button>
                  <button
                    onClick={() => submitReview(5)}
                    disabled={reviewing}
                    className="py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Easy</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * currentCard.srs.easeFactor * 1.3))}d</div>
                  </button>
                </div>

                <p className="text-xs text-center text-stone-500 mt-2">
                  How well did you remember this?
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
