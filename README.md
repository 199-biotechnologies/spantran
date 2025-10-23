# SpanTran 🇨🇴

Super simple Spanish/English translator optimized for mobile with Colombian Spanish focus.

## Features

- Casual Colombian Spanish translation (informal, slang, innuendos)
- Uses Claude Haiku 4.5 via OpenRouter for natural translations
- Translation history stored in Vercel KV
- Mobile-optimized PWA (add to iOS home screen)
- Simple, clean UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Add your OpenRouter API key to `.env.local`

3. Run locally:
```bash
npm run dev
```

4. Deploy to Vercel:
```bash
vercel --prod
```

5. After deployment, enable Vercel KV:
   - Go to your project on Vercel dashboard
   - Navigate to Storage tab
   - Create a new KV database
   - Connect it to your project
   - The KV environment variables will be automatically set

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Vercel KV (Redis)
- OpenRouter (Claude Haiku 4.5)

## PWA

The app works as a Progressive Web App and can be added to your iOS home screen:
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
