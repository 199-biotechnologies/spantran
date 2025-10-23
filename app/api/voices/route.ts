import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Utility route to list available voices for debugging
// Visit /api/voices to see your available voice IDs
export async function GET() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({
        error: 'API key not configured',
        help: 'Set ELEVENLABS_API_KEY in your environment variables'
      }, { status: 500 });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voices = await elevenlabs.voices.getAll();

    return NextResponse.json({
      success: true,
      count: voices.voices?.length || 0,
      voices: voices.voices?.map(voice => ({
        voiceId: voice.voiceId,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
      })) || [],
      currentVoiceId: 'scn1gPWkdVd8FhODJoei',
      help: 'If your voice ID is not in this list, add it to your Voice Lab at elevenlabs.io'
    });
  } catch (error: any) {
    console.error('Error fetching voices:', error);

    // Check if it's a permissions error
    if (error.message?.includes('missing_permissions')) {
      return NextResponse.json({
        error: 'API key missing permissions',
        message: error.message,
        help: 'Go to elevenlabs.io/app/settings/api-keys and edit your API key to enable: voices_read, text_to_speech, speech_to_text permissions'
      }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch voices',
        help: 'Check that your ELEVENLABS_API_KEY is valid and has the required permissions'
      },
      { status: 500 }
    );
  }
}
