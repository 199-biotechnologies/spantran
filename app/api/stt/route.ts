import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not set');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('Processing STT request:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      language
    });

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call ElevenLabs speech-to-text API
    const elevenlabsFormData = new FormData();
    // Create a proper Blob with correct mime type
    const audioBlob = new Blob([buffer], { type: audioFile.type || 'audio/webm' });
    // IMPORTANT: ElevenLabs expects 'file' parameter, not 'audio'
    elevenlabsFormData.append('file', audioBlob, audioFile.name);
    // IMPORTANT: Use 'scribe_v1' or 'scribe_v1_experimental', not eleven_multilingual_v2
    elevenlabsFormData.append('model_id', 'scribe_v1');
    // Disable audio event tags like (laughter), (music), (footsteps), etc.
    elevenlabsFormData.append('tag_audio_events', 'false');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: elevenlabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', response.status, errorText);
      return NextResponse.json(
        { error: `Speech-to-text failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('STT response:', data);

    return NextResponse.json({
      text: data.text || '',
    });

  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json(
      { error: 'Speech-to-text failed' },
      { status: 500 }
    );
  }
}
