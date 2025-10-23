'use client';

import { useState, useEffect } from 'react';

interface Translation {
  original: string;
  translation: string;
  fromLang: string;
  toLang: string;
  timestamp: number;
}

export default function Home() {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromLang, setFromLang] = useState<'en' | 'es'>('en');
  const [history, setHistory] = useState<Translation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          fromLang,
          toLang: fromLang === 'en' ? 'es' : 'en',
        }),
      });

      const data = await res.json();
      setTranslation(data.translation);

      // Refresh history after successful translation
      fetchHistory();
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setFromLang(fromLang === 'en' ? 'es' : 'en');
    setText('');
    setTranslation('');
  };

  const loadFromHistory = (item: Translation) => {
    setText(item.original);
    setTranslation(item.translation);
    setFromLang(item.fromLang as 'en' | 'es');
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">
            🇨🇴 SpanTran
          </h1>
          <p className="text-stone-600 text-base">
            Casual Colombian Spanish translator
          </p>
        </div>

        {/* Language Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-2xl font-semibold text-stone-700">
              {fromLang === 'en' ? '🇺🇸 EN' : '🇨🇴 ES'}
            </span>
            <button
              onClick={toggleLanguage}
              className="bg-stone-900 hover:bg-stone-800 text-white p-3 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <span className="text-2xl font-semibold text-stone-700">
              {fromLang === 'en' ? '🇨🇴 ES' : '🇺🇸 EN'}
            </span>
          </div>

          {/* Input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={fromLang === 'en' ? 'Enter English text...' : 'Escribe en español...'}
            className="w-full p-4 border-2 border-stone-300 rounded-xl resize-none focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 text-base transition-all"
            rows={4}
          />

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
            className="w-full mt-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Translating...
              </span>
            ) : (
              'Translate'
            )}
          </button>
        </div>

        {/* Translation Result */}
        {translation && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">
                {fromLang === 'en' ? '🇨🇴' : '🇺🇸'}
              </span>
              <h3 className="font-semibold text-stone-700">Translation:</h3>
            </div>
            <p className="text-base text-stone-900 leading-relaxed">{translation}</p>
          </div>
        )}

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full bg-white rounded-2xl shadow-sm border border-stone-200 p-4 mb-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
        >
          <span className="font-semibold text-stone-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History ({history.length})
          </span>
          <svg className={`w-5 h-5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* History List */}
        {showHistory && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 space-y-2 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-stone-500 text-center py-8">No translations yet</p>
            ) : (
              history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => loadFromHistory(item)}
                  className="w-full text-left p-3 rounded-xl hover:bg-stone-50 transition-colors border border-stone-200"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {item.fromLang === 'en' ? '🇺🇸→🇨🇴' : '🇨🇴→🇺🇸'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-600 truncate">{item.original}</p>
                      <p className="text-sm text-stone-900 font-medium truncate">{item.translation}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
