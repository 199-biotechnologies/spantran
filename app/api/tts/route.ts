import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set');
}

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Using a default voice ID - this should be updated to match a voice in your Voice Lab
const VOICE_ID = 'scn1gPWkdVd8FhODJoei';

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Create cache key based on text and language
    const cacheKey = `tts:${language}:${Buffer.from(text).toString('base64').substring(0, 100)}`;

    // Check cache first
    try {
      const cachedAudio = await kv.get(cacheKey);
      if (cachedAudio) {
        console.log('Returning cached audio');
        // Return cached base64 audio
        return NextResponse.json({
          audio: cachedAudio,
          cached: true,
        });
      }
    } catch (cacheError) {
      console.error('Cache check error:', cacheError);
      // Continue to generate if cache fails
    }

    // Generate audio if not cached
    console.log('Generating new audio with ElevenLabs for voice:', VOICE_ID);

    try {
      const audioStream = await elevenlabs.textToSpeech.convert(VOICE_ID, {
        text,
        modelId: 'eleven_turbo_v2_5',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
      });

      // Convert stream to buffer
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));

      // Convert to base64 for storage and transmission
      const audioBase64 = audioBuffer.toString('base64');

      // Cache the audio (expires in 30 days)
      try {
        await kv.set(cacheKey, audioBase64, {
          ex: 60 * 60 * 24 * 30,
        });
      } catch (cacheError) {
        console.error('Cache storage error:', cacheError);
        // Continue even if caching fails
      }

      return NextResponse.json({
        audio: audioBase64,
        cached: false,
      });
    } catch (elevenLabsError: any) {
      console.error('ElevenLabs TTS API error:', elevenLabsError);
      throw new Error(`ElevenLabs API failed: ${elevenLabsError.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech failed' },
      { status: 500 }
    );
  }
}
