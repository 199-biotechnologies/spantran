'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Translation {
  key?: string;
  original: string;
  translation: string;
  examples?: string[];
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
          (item.examples && item.examples.some(ex => ex.toLowerCase().includes(query)))
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
                        <p className="text-xs text-stone-500 uppercase tracking-wide mb-0.5">Original:</p>
                        <p className="text-sm text-stone-700">{item.original}</p>
                      </div>

                      <div>
                        <p className="text-xs text-stone-500 uppercase tracking-wide mb-0.5">Translation:</p>
                        <p className="text-base text-stone-900 font-semibold">{item.translation}</p>
                      </div>

                      {item.examples && item.examples.length > 0 && (
                        <div>
                          <p className="text-xs text-stone-500 uppercase tracking-wide mb-0.5">Examples:</p>
                          <div className="space-y-0.5">
                            {item.examples.map((example, idx) => (
                              <p key={idx} className="text-xs text-stone-600 italic pl-2 border-l-2 border-stone-300">
                                {example}
                              </p>
                            ))}
                          </div>
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
