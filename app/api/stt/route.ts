import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call ElevenLabs speech-to-text API
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('audio', new Blob([buffer]), audioFile.name);
    elevenlabsFormData.append('model', 'eleven_multilingual_v2');
    elevenlabsFormData.append('language_code', language === 'en' ? 'eng' : 'spa');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: elevenlabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', errorText);
      throw new Error('Speech-to-text failed');
    }

    const data = await response.json();

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
