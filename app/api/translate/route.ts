import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const TRANSLATION_PROMPT = `You are a casual, fun translator between English and Colombian Spanish.

Key rules:
- Use INFORMAL language (tú, not usted)
- Use COLOMBIAN Spanish slang and expressions when natural
- Keep it CASUAL and conversational
- Use SIMPLE words, verbs, and grammar (avoid complex constructions)
- Include innuendos and playful language when appropriate
- Sound like a real Colombian person chatting with a friend

Translate naturally - don't be overly literal. Make it sound how a Colombian would actually say it.`;

export async function POST(request: NextRequest) {
  try {
    const { text, fromLang, toLang } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const direction = fromLang === 'en' ? 'English to Colombian Spanish' : 'Colombian Spanish to English';

    const completion = await openai.chat.completions.create({
      model: 'anthropic/claude-haiku-4.5',
      messages: [
        {
          role: 'system',
          content: TRANSLATION_PROMPT
        },
        {
          role: 'user',
          content: `Translate from ${direction}:\n\n${text}`
        }
      ],
      temperature: 0.7,
    });

    const translation = completion.choices[0]?.message?.content || '';

    // Store in KV with timestamp
    const timestamp = Date.now();
    const historyKey = `translation:${timestamp}`;

    try {
      await kv.set(historyKey, {
        original: text,
        translation,
        fromLang,
        toLang,
        timestamp,
      }, {
        ex: 60 * 60 * 24 * 30, // 30 days expiry
      });

      // Add to user's history list (keep last 100)
      await kv.zadd('translation:history', {
        score: timestamp,
        member: historyKey,
      });

      // Trim to keep only last 100 translations
      await kv.zremrangebyrank('translation:history', 0, -101);
    } catch (kvError) {
      console.error('KV storage error (will still return translation):', kvError);
      // Don't fail the request if KV fails
    }

    return NextResponse.json({
      translation,
      original: text,
      fromLang,
      toLang,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}
