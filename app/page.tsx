'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromLang, setFromLang] = useState<'en' | 'es'>('en');
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setCurrentKey(null); // Reset current key
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
      setExamples(data.examples || []);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
      setExamples([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setFromLang(fromLang === 'en' ? 'es' : 'en');
    setText('');
    setTranslation('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', fromLang);

        try {
          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          setText(data.text);
        } catch (error) {
          console.error('Speech-to-text error:', error);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudio = async (textToSpeak: string, lang: string) => {
    setIsPlayingAudio(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          language: lang,
        }),
      });

      const data = await res.json();

      // Convert base64 to audio and play
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-6">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-900">
            🇨🇴 SpanTran
          </h1>
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

          {/* Input with Mic Button */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={fromLang === 'en' ? 'Enter English text...' : 'Escribe en español...'}
              className="w-full p-4 pr-16 border-2 border-stone-300 rounded-xl resize-none focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 text-2xl transition-all"
              rows={3}
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`absolute right-3 top-3 p-3 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          </div>

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {fromLang === 'en' ? '🇨🇴' : '🇺🇸'}
                </span>
              </div>
              <button
                onClick={() => playAudio(translation, fromLang === 'en' ? 'es' : 'en')}
                disabled={isPlayingAudio}
                className="p-3 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors disabled:opacity-50"
                title="Play audio"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  {isPlayingAudio ? (
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  ) : (
                    <path d="M8 5v14l11-7z"/>
                  )}
                </svg>
              </button>
            </div>

            {/* Main Translation - Large font */}
            <p className="text-4xl font-semibold text-stone-900 leading-relaxed mb-6">{translation}</p>

            {/* Usage Examples - Smaller font */}
            {examples && examples.length > 0 && (
              <div className="mt-6 pt-6 border-t border-stone-200">
                <h4 className="text-sm font-semibold text-stone-600 mb-3 uppercase tracking-wide">Usage Examples:</h4>
                <div className="space-y-2">
                  {examples.map((example, idx) => (
                    <p key={idx} className="text-sm text-stone-700 leading-relaxed pl-4 border-l-2 border-stone-300">
                      {example}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/history"
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-stone-700">History</span>
          </Link>

          <Link
            href="/flashcards"
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
          >
            <span className="text-xl">📚</span>
            <span className="font-semibold text-stone-700">Flashcards</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
