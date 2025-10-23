'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [examples, setExamples] = useState<Array<{ text: string; english: string }>>([]);
  const [streetAlternative, setStreetAlternative] = useState('');
  const [streetExamples, setStreetExamples] = useState<Array<{ text: string; english: string }>>([]);
  const [showStreet, setShowStreet] = useState(false);
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
      setStreetAlternative(data.street_alternative || '');
      setStreetExamples(data.street_examples || []);
      setShowStreet(false); // Reset to collapsed state
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
      setExamples([]);
      setStreetAlternative('');
      setStreetExamples([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setFromLang(fromLang === 'en' ? 'es' : 'en');
    // Keep the text, just clear the translation since direction changed
    setTranslation('');
    setExamples([]);
    setStreetAlternative('');
    setStreetExamples([]);
    setShowStreet(false);
  };

  const startRecording = async () => {
    try {
      // AudioSession API workaround for iOS PWA standalone mode
      // @ts-ignore - AudioSession API is not in TypeScript definitions yet
      if (navigator.audioSession) {
        try {
          // @ts-ignore
          navigator.audioSession.type = 'auto';
        } catch (e) {
          console.warn('AudioSession API failed:', e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // After permission granted, set play-and-record for proper routing (iOS PWA fix)
      // @ts-ignore
      if (navigator.audioSession) {
        try {
          // @ts-ignore
          navigator.audioSession.type = 'play-and-record';
          console.log('AudioSession set to play-and-record');
        } catch (e) {
          console.warn('AudioSession play-and-record failed:', e);
        }
      }

      // Detect iOS/Safari
      const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) &&
                          /Safari/.test(navigator.userAgent) &&
                          !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

      // Detect supported MIME type (iOS uses audio/mp4, desktop uses audio/webm)
      let mimeType = 'audio/webm';
      let fileExtension = 'webm';

      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        // Filter out empty blobs - Safari bug fix
        if (event.data && event.data.size > 0) {
          console.log('Received audio chunk:', event.data.size, 'bytes');
          audioChunks.push(event.data);
        } else {
          console.warn('Skipped empty audio chunk');
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, total chunks:', audioChunks.length);

        // Check if we have any valid chunks
        if (audioChunks.length === 0) {
          console.error('No audio chunks recorded');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log('Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

        // Validate blob size before upload
        if (audioBlob.size === 0) {
          console.error('Recording failed: empty audio file');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${fileExtension}`);
        formData.append('language', fromLang);

        try {
          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();

          // Check for errors in response
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Speech-to-text failed');
          }

          if (data.text) {
            setText(data.text);
          } else {
            throw new Error('No text received from speech-to-text');
          }
        } catch (error: any) {
          console.error('Speech-to-text error:', error);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Reset AudioSession after recording (iOS PWA fix)
        // @ts-ignore
        if (navigator.audioSession) {
          try {
            // @ts-ignore
            navigator.audioSession.type = 'playback';
            // @ts-ignore
            navigator.audioSession.type = 'auto';
            console.log('AudioSession reset to auto');
          } catch (e) {
            console.warn('AudioSession reset failed:', e);
          }
        }
      };

      // iOS Safari only fires ondataavailable once when stop() is called
      // Desktop browsers support timeslice
      if (isIOSSafari) {
        console.log('iOS Safari detected - recording without timeslice');
        recorder.start(); // No timeslice for iOS
      } else {
        console.log('Desktop browser detected - recording with timeslice');
        recorder.start(1000); // Request data every 1 second
      }

      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      // Force data collection before stopping (Option 3)
      try {
        mediaRecorder.requestData();
      } catch (error) {
        console.warn('requestData() failed:', error);
      }

      // Small delay to ensure data is collected
      setTimeout(() => {
        mediaRecorder.stop();
      }, 100);

      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudio = async (textToSpeak: string, lang: string) => {
    setIsPlayingAudio(true);

    // AudioSession API for iOS PWA standalone mode
    // @ts-ignore
    if (navigator.audioSession) {
      try {
        // @ts-ignore
        navigator.audioSession.type = 'playback';
        console.log('AudioSession set to playback');
      } catch (e) {
        console.warn('AudioSession playback failed:', e);
      }
    }

    // Create audio element immediately (synchronously) for iOS compatibility
    const audio = document.createElement('audio');
    audio.controls = false;
    audio.setAttribute('playsinline', 'true'); // Required for iOS
    audio.preload = 'auto'; // Preload for better iOS compatibility

    // Add to DOM for iOS compatibility
    audio.style.display = 'none';
    document.body.appendChild(audio);

    audio.onended = () => {
      setIsPlayingAudio(false);
      document.body.removeChild(audio);
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      console.error('Audio error details:', audio.error);
      setIsPlayingAudio(false);
      if (document.body.contains(audio)) {
        document.body.removeChild(audio);
      }
    };

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

      // Check for errors in response
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
      await audio.load();

      // Cleanup URL after load
      audio.onloadeddata = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error: any) {
      console.error('Text-to-speech error:', error);
      setIsPlayingAudio(false);
      if (document.body.contains(audio)) {
        document.body.removeChild(audio);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#EABD56', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 overflow-y-auto overscroll-none">
        <div className="max-w-2xl mx-auto p-6 pb-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/app-logo.svg" alt="CHIMBA Translate" className="h-16 mx-auto" />
        </div>

        {/* Language Toggle */}
        <div className="bg-white rounded-2xl border-2 border-black p-6 mb-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-stone-700 w-32 justify-end">
              <img
                src={fromLang === 'en' ? '/english-flag.svg' : '/colombia-flag.svg'}
                alt={fromLang === 'en' ? 'English' : 'Spanish'}
                className="w-8 h-8"
              />
              <span className="text-2xl font-semibold">{fromLang === 'en' ? 'EN' : 'ES'}</span>
            </div>
            <button
              onClick={toggleLanguage}
              className="bg-stone-900 hover:bg-stone-800 text-white p-3 rounded-full transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-stone-700 w-32">
              <img
                src={fromLang === 'en' ? '/colombia-flag.svg' : '/english-flag.svg'}
                alt={fromLang === 'en' ? 'Spanish' : 'English'}
                className="w-8 h-8"
              />
              <span className="text-2xl font-semibold">{fromLang === 'en' ? 'ES' : 'EN'}</span>
            </div>
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
            className="w-full mt-4 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
            style={{ backgroundColor: '#177298' }}
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
          <div className="bg-white rounded-2xl border-2 border-black p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img
                  src={fromLang === 'en' ? '/colombia-flag.svg' : '/english-flag.svg'}
                  alt={fromLang === 'en' ? 'Spanish' : 'English'}
                  className="w-8 h-8"
                />
              </div>
              <button
                onClick={() => playAudio(translation, fromLang === 'en' ? 'es' : 'en')}
                disabled={isPlayingAudio}
                className="p-3 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors disabled:opacity-50"
                title="Play audio"
              >
                <img src="/sound.svg" alt="Play audio" className="w-6 h-6" />
              </button>
            </div>

            {/* Main Translation - Large font */}
            <p className="text-4xl font-semibold text-stone-900 leading-relaxed mb-6">{translation}</p>

            {/* Usage Examples - Smaller font */}
            {examples && examples.length > 0 && (
              <div className="mt-6 pt-6 border-t border-stone-200">
                <h4 className="text-sm font-semibold text-stone-600 mb-3 uppercase tracking-wide">Usage Examples:</h4>
                <div className="space-y-3">
                  {examples.map((example, idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-stone-300 space-y-1">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => playAudio(example.text, fromLang === 'en' ? 'es' : 'en')}
                          disabled={isPlayingAudio}
                          className="flex-shrink-0 p-1 hover:bg-stone-100 rounded transition-colors disabled:opacity-50 mt-0.5"
                          title="Play audio"
                        >
                          <img src="/sound.svg" alt="Play" className="w-3 h-3" />
                        </button>
                        <div className="flex-1">
                          <p className="text-sm text-stone-900 leading-relaxed font-medium">
                            {example.text}
                          </p>
                          <p className="text-xs text-stone-500 italic">
                            {example.english}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Street/Vulgar Alternative - Collapsible */}
        {streetAlternative && (
          <div className="bg-stone-50 rounded-2xl border-2 border-black p-6 mb-4">
            <button
              onClick={() => setShowStreet(!showStreet)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Street Colombian</h4>
                <p className="text-xs text-stone-600">Ultra-casual slang / Explicit language</p>
              </div>
              <svg
                className={`w-6 h-6 text-stone-600 transition-transform ${showStreet ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showStreet && (
              <div className="mt-4 pt-4 border-t border-stone-300">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => playAudio(streetAlternative, fromLang === 'en' ? 'es' : 'en')}
                    disabled={isPlayingAudio}
                    className="p-2 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors disabled:opacity-50"
                    title="Play audio"
                  >
                    <img src="/sound.svg" alt="Play audio" className="w-5 h-5" />
                  </button>
                </div>

                {/* Street Translation */}
                <p className="text-3xl font-semibold text-stone-900 leading-relaxed mb-6">{streetAlternative}</p>

                {/* Street Examples */}
                {streetExamples && streetExamples.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-stone-300">
                    <h4 className="text-sm font-semibold text-stone-600 mb-3 uppercase tracking-wide">Street Examples:</h4>
                    <div className="space-y-3">
                      {streetExamples.map((example, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-stone-400 space-y-1">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => playAudio(example.text, fromLang === 'en' ? 'es' : 'en')}
                              disabled={isPlayingAudio}
                              className="flex-shrink-0 p-1 hover:bg-stone-100 rounded transition-colors disabled:opacity-50 mt-0.5"
                              title="Play audio"
                            >
                              <img src="/sound.svg" alt="Play" className="w-3 h-3" />
                            </button>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-relaxed font-medium">
                                {example.text}
                              </p>
                              <p className="text-xs text-stone-500 italic">
                                {example.english}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        </div>
      </div>

      {/* Fixed Navigation Buttons at Bottom */}
      <div className="flex-shrink-0 border-t-2 border-black" style={{ backgroundColor: '#EABD56', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto px-6 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/history"
              className="rounded-xl border-2 border-black py-2.5 px-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-white"
              style={{ backgroundColor: '#177298' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm">History</span>
            </Link>

            <Link
              href="/flashcards"
              className="rounded-xl border-2 border-black py-2.5 px-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-white"
              style={{ backgroundColor: '#177298' }}
            >
              <img src="/flashcards.svg" alt="Flashcards" className="w-4 h-4 brightness-0 invert" />
              <span className="font-medium text-sm">Flashcards</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
