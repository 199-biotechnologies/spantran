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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (key: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
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
                className="bg-white rounded-2xl shadow-sm border border-stone-200 p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-2">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">
                        {item.fromLang === 'en' ? '🇺🇸→🇨🇴' : '🇨🇴→🇺🇸'}
                      </span>
                      <p className="text-xs text-stone-400">
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-stone-500 uppercase tracking-wide">Original:</p>
                          <button
                            onClick={() => playAudio(item.original, item.fromLang, `${item.key}-original`)}
                            disabled={playingAudio === `${item.key}-original`}
                            className="text-stone-600 hover:text-stone-900 disabled:opacity-50 transition-colors"
                            title="Play audio"
                          >
                            {playingAudio === `${item.key}-original` ? '🔊' : '🔈'}
                          </button>
                        </div>
                        <p className="text-sm text-stone-700">{item.original}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-stone-500 uppercase tracking-wide">Translation:</p>
                          <button
                            onClick={() => playAudio(item.translation, item.toLang, `${item.key}-translation`)}
                            disabled={playingAudio === `${item.key}-translation`}
                            className="text-stone-600 hover:text-stone-900 disabled:opacity-50 transition-colors"
                            title="Play audio"
                          >
                            {playingAudio === `${item.key}-translation` ? '🔊' : '🔈'}
                          </button>
                        </div>
                        <p className="text-base text-stone-900 font-semibold">{item.translation}</p>
                      </div>

                      {item.examples && item.examples.length > 0 && (
                        <div>
                          <button
                            onClick={() => item.key && toggleExpanded(item.key)}
                            className="text-xs text-stone-600 hover:text-stone-900 uppercase tracking-wide mb-1 flex items-center gap-1 transition-colors"
                          >
                            {expandedCards.has(item.key || '') ? '▼' : '▶'} Examples ({item.examples.length})
                          </button>
                          {expandedCards.has(item.key || '') && (
                            <div className="space-y-2 mt-2">
                              {item.examples.map((example, idx) => (
                                <div key={idx} className="pl-2 border-l-2 border-stone-300 space-y-0.5">
                                  <p className="text-xs text-stone-900 font-medium">
                                    {example.text}
                                  </p>
                                  <p className="text-xs text-stone-500 italic">
                                    {example.english}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {item.key && (
                      <>
                        <button
                          onClick={() => toggleFavorite(item.key!, item.favorite || false)}
                          className="text-xl hover:scale-110 transition-transform"
                          title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {item.favorite ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => deleteItem(item.key!)}
                          disabled={deleting === item.key}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === item.key ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
    </div>
  );
}
