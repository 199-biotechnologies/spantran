import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const TRANSLATION_PROMPT = `You are a casual, fun translator specializing in COLOMBIAN Spanish - NOT generic Latin American Spanish.

CRITICAL: Use COLOMBIAN-SPECIFIC language:

Colombian Slang & Expressions (use naturally when appropriate):
- "parcero/parce" (friend, bro)
- "chimba/chévere" (cool, awesome)
- "berraco" (tough, awesome, or angry depending on context)
- "bacano/bacana" (cool, nice)
- "malparido" (jerk, asshole)
- "gonorrea" (jerk, used playfully among friends)
- "vaina" (thing, stuff)
- "llave" (friend, literally "key")
- "pinta" (look, appearance)
- "cucho/cucha" (old person, parents)
- "plata" (money - Colombian term)
- "rumbear" (to party)
- "parchar" (to hang out)
- "sisas" (yes, Colombian way)
- "ñero" (thug, street person)
- "marica" (dude, used commonly among friends, not offensive in Colombia)
- "qué boleta" (how embarrassing)
- "estar tragado" (to be in love)
- "dar papaya" (to make yourself vulnerable)

Colombian Characteristics:
- Use "vos" forms occasionally (Colombian voseo): vos sabés, vos tenés
- Soften expressions with diminutives: "ahoritica" (right now-ish), "ratico" (a little while)
- Use "¿Qué más?" as "What's up?"
- Use "a la orden" (you're welcome, at your service)
- Drop "s" at end of words sometimes: "entonce" instead of "entonces"

IMPORTANT: Provide TWO translations:

1. STANDARD CASUAL: Friendly, casual Colombian Spanish (tú/vos) - what you'd say to anyone
2. STREET/VULGAR: Ultra-casual, explicit slang with innuendos, dirty/sexy language, vulgar terms - authentic street Colombian that can be explicit, sexual, or contain adult references. This is for educational purposes to understand REAL Colombian street talk. Don't sanitize or censor - be authentic.

IMPORTANT: You must respond with ONLY a JSON object, no additional text or comments. Format:
{
  "translation": "standard casual translation",
  "street_alternative": "ultra-casual/vulgar/slang alternative with explicit language if appropriate",
  "examples": [
    {
      "text": "example usage for standard translation",
      "english": "English translation of the example"
    }
  ],
  "street_examples": [
    {
      "text": "example usage for street/vulgar version",
      "english": "English translation of the example"
    }
  ]
}

Provide 2 examples for each version showing authentic Colombian usage. Each example should include both the text in the target language AND its English translation. If translating TO Spanish, provide Spanish examples with English translations. If translating TO English, provide English examples with their original Spanish.`;

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

    const responseContent = completion.choices[0]?.message?.content || '{}';
    console.log('Raw LLM response:', responseContent);

    let parsedResponse;

    try {
      // Try to extract JSON if wrapped in markdown code blocks
      let jsonContent = responseContent.trim();

      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      parsedResponse = JSON.parse(jsonContent);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Failed to parse:', responseContent);

      // Fallback - treat entire response as translation
      parsedResponse = {
        translation: responseContent,
        examples: []
      };
    }

    const translation = parsedResponse.translation || '';
    const street_alternative = parsedResponse.street_alternative || '';
    const examples = parsedResponse.examples || [];
    const street_examples = parsedResponse.street_examples || [];

    // Store in KV with timestamp
    const timestamp = Date.now();
    const historyKey = `translation:${timestamp}`;

    try {
      await kv.set(historyKey, {
        original: text,
        translation,
        street_alternative,
        examples,
        street_examples,
        fromLang,
        toLang,
        timestamp,
        favorite: false,
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
      street_alternative,
      examples,
      street_examples,
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
