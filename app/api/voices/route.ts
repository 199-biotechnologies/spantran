import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Utility route to list available voices for debugging
export async function GET() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voices = await elevenlabs.voices.getAll();

    return NextResponse.json({
      voices: voices.voices?.map(voice => ({
        voiceId: voice.voiceId,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
      })) || [],
    });
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
