'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Translation {
  key?: string;
  original: string;
  translation: string;
  examples?: Array<{ text: string; english: string }>;
  fromLang: string;
  toLang: string;
  timestamp: number;
  favorite?: boolean;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<Translation[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<Translation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Translation | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    // Filter history based on search query
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = history.filter(
        (item) =>
          item.original.toLowerCase().includes(query) ||
          item.translation.toLowerCase().includes(query) ||
          (item.examples && item.examples.some(ex =>
            ex.text?.toLowerCase().includes(query) ||
            ex.english?.toLowerCase().includes(query)
          ))
      );
      setFilteredHistory(filtered);
    }
  }, [searchQuery, history]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (key: string, currentFavorite: boolean) => {
    try {
      await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          favorite: !currentFavorite,
        }),
      });

      // Update local state
      setHistory(history.map(item =>
        item.key === key ? { ...item, favorite: !currentFavorite } : item
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const deleteItem = async (key: string) => {
    if (!confirm('Delete this translation?')) return;

    setDeleting(key);
    try {
      const res = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        // Remove from local state
        setHistory(history.filter(item => item.key !== key));
      } else {
        alert('Failed to delete item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete item');
    } finally {
      setDeleting(null);
    }
  };

  const playAudio = async (text: string, lang: string, audioId: string) => {
    setPlayingAudio(audioId);

    // Create audio element immediately (synchronously) for iOS compatibility
    const audio = document.createElement('audio');
    audio.controls = false;

    audio.onended = () => {
      setPlayingAudio(null);
      audio.remove();
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      setPlayingAudio(null);
      audio.remove();
    };

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

      // Convert base64 to audio data
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Set source and play
      audio.src = audioUrl;
      audio.load();

      // Cleanup URL after load
      audio.onloadeddata = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error: any) {
      console.error('TTS error:', error);
      alert('Text-to-speech failed: ' + error.message);
      setPlayingAudio(null);
      audio.remove();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full p-6">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <Link href="/" className="text-stone-600 hover:text-stone-900 text-2xl">
            ←
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900">History</h1>
            <p className="text-sm text-stone-600">{history.length} translations</p>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Search Bar */}
        <div className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-stone-200 p-3 mb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search translations..."
              className="w-full pl-10 pr-3 py-2 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 text-sm transition-all"
            />
          </div>
        </div>

        {/* History List - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
                <p className="text-stone-500">
                  {searchQuery ? 'No translations found' : 'No translations yet'}
                </p>
              </div>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.key}
                onClick={() => setSelectedCard(item)}
                className="bg-white rounded-2xl shadow-sm border border-stone-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <img
                          src={item.fromLang === 'en' ? '/english-flag.svg' : '/colombia-flag.svg'}
                          alt={item.fromLang === 'en' ? 'English' : 'Spanish'}
                          className="w-5 h-5"
                        />
                        <span className="text-base">→</span>
                        <img
                          src={item.fromLang === 'en' ? '/colombia-flag.svg' : '/english-flag.svg'}
                          alt={item.fromLang === 'en' ? 'Spanish' : 'English'}
                          className="w-5 h-5"
                        />
                      </div>
                      <p className="text-xs text-stone-400">
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {item.examples && item.examples.length > 0 && (
                        <span className="text-xs text-stone-500 ml-auto">
                          {item.examples.length} examples
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-stone-700">{item.original}</p>
                      <p className="text-base text-stone-900 font-semibold">{item.translation}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.key && (
                      <>
                        <button
                          onClick={() => toggleFavorite(item.key!, item.favorite || false)}
                          className="p-1 hover:bg-stone-100 rounded transition-colors"
                          title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <img
                            src={item.favorite ? "/star-full.svg" : "/star-empty.svg"}
                            alt={item.favorite ? "Starred" : "Star"}
                            className="w-5 h-5"
                          />
                        </button>
                        <button
                          onClick={() => deleteItem(item.key!)}
                          disabled={deleting === item.key}
                          className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === item.key ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <img src="/remove.svg" alt="Delete" className="w-5 h-5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <img
                    src={selectedCard.fromLang === 'en' ? '/english-flag.svg' : '/colombia-flag.svg'}
                    alt={selectedCard.fromLang === 'en' ? 'English' : 'Spanish'}
                    className="w-6 h-6"
                  />
                  <span className="text-lg">→</span>
                  <img
                    src={selectedCard.fromLang === 'en' ? '/colombia-flag.svg' : '/english-flag.svg'}
                    alt={selectedCard.fromLang === 'en' ? 'Spanish' : 'English'}
                    className="w-6 h-6"
                  />
                </div>
                <p className="text-xs text-stone-500">
                  {new Date(selectedCard.timestamp).toLocaleDateString()} {new Date(selectedCard.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Original */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Original:</p>
                  <button
                    onClick={() => playAudio(selectedCard.original, selectedCard.fromLang, 'modal-original')}
                    disabled={playingAudio === 'modal-original'}
                    className="p-1 hover:bg-stone-100 rounded transition-colors disabled:opacity-50"
                    title="Play audio"
                  >
                    <img src="/sound.svg" alt="Play" className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-lg text-stone-800">{selectedCard.original}</p>
              </div>

              {/* Translation */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Translation:</p>
                  <button
                    onClick={() => playAudio(selectedCard.translation, selectedCard.toLang, 'modal-translation')}
                    disabled={playingAudio === 'modal-translation'}
                    className="p-1 hover:bg-stone-100 rounded transition-colors disabled:opacity-50"
                    title="Play audio"
                  >
                    <img src="/sound.svg" alt="Play" className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xl text-stone-900 font-semibold">{selectedCard.translation}</p>
              </div>

              {/* Examples */}
              {selectedCard.examples && selectedCard.examples.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Examples:</p>
                  <div className="space-y-4">
                    {selectedCard.examples.map((example, idx) => (
                      <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2">
                        <p className="text-base text-stone-900 font-medium">
                          {example.text}
                        </p>
                        <p className="text-sm text-stone-600 italic">
                          {example.english}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
