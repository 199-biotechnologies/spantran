'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Flashcard {
  key: string;
  original: string;
  translation: string;
  examples: Array<{ text: string; english: string }>;
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
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

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

  const playAudio = async (text: string, lang: string, audioId: string) => {
    setPlayingAudio(audioId);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Text-to-speech failed');
      }

      if (!data.audio) {
        throw new Error('No audio data received from server');
      }

      // Convert base64 to audio and play
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Use source element for better iOS Safari compatibility
      const audio = document.createElement('audio');
      const source = document.createElement('source');
      source.src = audioUrl;
      source.type = 'audio/mpeg';
      audio.appendChild(source);

      audio.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
        audio.remove();
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
        audio.remove();
      };

      audio.load();
      await audio.play();
    } catch (error: any) {
      console.error('TTS error:', error);
      alert('Text-to-speech failed: ' + error.message);
      setPlayingAudio(null);
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
      <div className="h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col overflow-hidden">
        <div className="max-w-2xl mx-auto w-full flex flex-col h-full p-6">
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center justify-between mb-4">
            <Link href="/" className="text-stone-600 hover:text-stone-900 text-2xl">
              ←
            </Link>
            <h1 className="text-2xl font-bold text-stone-900">📚 Flashcards</h1>
            <div className="w-8"></div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center max-w-md">
              <p className="text-xl text-stone-700 mb-4">No flashcards due for review!</p>
              <p className="text-stone-600 mb-6">Star translations in your history to add them to your flashcard deck.</p>
              <Link
                href="/"
                className="inline-block bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Back to Translator
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full p-6">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <Link href="/" className="text-stone-600 hover:text-stone-900 text-2xl">
            ←
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900">📚 Flashcards</h1>
            <p className="text-sm text-stone-600">
              {currentIndex + 1} / {flashcards.length}
            </p>
          </div>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Flashcard - Fills remaining space */}
        {currentCard && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-stone-200 p-6 overflow-hidden">
            {/* Question Side */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-stone-500 mb-3">
                {currentCard.fromLang === 'en' ? 'English → Spanish' : 'Spanish → English'}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-semibold text-stone-900 text-center px-4">
                  {currentCard.original}
                </p>
                <button
                  onClick={() => playAudio(currentCard.original, currentCard.fromLang, 'question')}
                  disabled={playingAudio === 'question'}
                  className="text-2xl text-stone-600 hover:text-stone-900 disabled:opacity-50 transition-colors flex-shrink-0"
                  title="Play audio"
                >
                  {playingAudio === 'question' ? '🔊' : '🔈'}
                </button>
              </div>
            </div>

            {/* Show Answer Button */}
            {!showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="flex-shrink-0 w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                Show Answer
              </button>
            )}

            {/* Answer Side */}
            {showAnswer && (
              <div className="flex-shrink-0 space-y-4">
                <div className="text-center py-4 border-t border-stone-200">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <p className="text-2xl font-semibold text-stone-900">
                      {currentCard.translation}
                    </p>
                    <button
                      onClick={() => playAudio(currentCard.translation, currentCard.toLang, 'answer')}
                      disabled={playingAudio === 'answer'}
                      className="text-2xl text-stone-600 hover:text-stone-900 disabled:opacity-50 transition-colors flex-shrink-0"
                      title="Play audio"
                    >
                      {playingAudio === 'answer' ? '🔊' : '🔈'}
                    </button>
                  </div>

                  {/* Examples */}
                  {currentCard.examples && currentCard.examples.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Examples:</p>
                      <div className="space-y-2">
                        {currentCard.examples.map((example, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <p className="text-xs text-stone-900 font-medium">
                              {example.text}
                            </p>
                            <p className="text-xs text-stone-500 italic">
                              {example.english}
                            </p>
                          </div>
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
                    className="py-3 px-2 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Again</div>
                    <div className="text-sm">1d</div>
                  </button>
                  <button
                    onClick={() => submitReview(3)}
                    disabled={reviewing}
                    className="py-3 px-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Hard</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * 1.2))}d</div>
                  </button>
                  <button
                    onClick={() => submitReview(4)}
                    disabled={reviewing}
                    className="py-3 px-2 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Good</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * currentCard.srs.easeFactor))}d</div>
                  </button>
                  <button
                    onClick={() => submitReview(5)}
                    disabled={reviewing}
                    className="py-3 px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs">Easy</div>
                    <div className="text-sm">{Math.max(1, Math.round(currentCard.srs.interval * currentCard.srs.easeFactor * 1.3))}d</div>
                  </button>
                </div>

                <p className="text-xs text-center text-stone-500">
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
