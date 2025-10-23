# Troubleshooting Guide for Colombian Translator

## TTS/STT Not Working

If you're getting errors when using Text-to-Speech (speaker button) or Speech-to-Text (microphone button), the most common issue is **API key permissions**.

### ✅ Solution: Update Your ElevenLabs API Key Permissions

1. **Go to ElevenLabs Settings**
   - Visit: https://elevenlabs.io/app/settings/api-keys

2. **Edit Your API Key**
   - Click the pencil icon (edit) next to your API key
   - Enable these permissions:
     - ✅ `text_to_speech` - Required for TTS (speaker button)
     - ✅ `speech_to_text` - Required for STT (microphone button)
     - ✅ `voices_read` - Required to list/verify voices

3. **Alternative: Disable "Restrict Key"**
   - You can turn off "Restrict Key" to grant full access to all features
   - This is easier but less secure for production use

4. **Update in Vercel**
   - Copy your updated API key
   - Go to your Vercel project settings
   - Update the `ELEVENLABS_API_KEY` environment variable
   - Redeploy your application

### 🔍 How to Verify Your API Key Works

Test your API key with curl:

```bash
# Test Text-to-Speech
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "model_id": "eleven_turbo_v2_5"}' \
  -o test.mp3

# If it works, test.mp3 will contain audio
# If it fails, you'll see an error message like:
# {"detail":{"status":"missing_permissions","message":"The API key you used is missing the permission text_to_speech..."}}
```

### 🎤 Voice ID Setup

The app uses voice ID: `scn1gPWkdVd8FhODJoei`

**If this voice doesn't work:**

1. **Check if the voice is in your account**
   - Visit: `/api/voices` in your deployed app
   - This will list all voices available to your API key
   - Look for the voice ID in the list

2. **If the voice is NOT in the list:**
   - The voice might be from the Voice Library (public voices)
   - You need to **add it to your Voice Lab** first:
     - Go to: https://elevenlabs.io/voice-library
     - Search for the voice
     - Click "Add to Voice Lab"

3. **Use a different voice:**
   - Copy any `voiceId` from the `/api/voices` endpoint
   - Update the `VOICE_ID` in `app/api/tts/route.ts`

### 📱 Client-Side Errors

If you see "Application error: a client-side exception has occurred":

1. **Check browser console** (F12 → Console tab)
   - This will show the actual error message
   - Common errors:
     - "Text-to-speech failed" - API key issue
     - "No audio data received" - Backend error
     - "Speech-to-text failed" - Recording or API issue

2. **Check Vercel logs**
   - Go to your Vercel project
   - Click "Logs" to see backend errors
   - Look for ElevenLabs API error messages

### 🐛 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `missing_permissions` | API key lacks required permissions | Update API key permissions (see above) |
| `voice_not_found` | Voice ID doesn't exist in your account | Add voice to Voice Lab or use different voice |
| `invalid_api_key` | API key is wrong or expired | Generate new API key |
| `Application error` | Client-side exception | Check browser console for details |

### 📝 Testing Checklist

- [ ] API key has `text_to_speech` permission
- [ ] API key has `speech_to_text` permission
- [ ] API key has `voices_read` permission
- [ ] Voice ID exists in Voice Lab (check `/api/voices`)
- [ ] Environment variable `ELEVENLABS_API_KEY` is set in Vercel
- [ ] Application has been redeployed after updating env vars
- [ ] Browser console shows no errors
- [ ] Vercel logs show no backend errors

### 🆘 Still Not Working?

1. Visit `/api/voices` to debug your setup
2. Check Vercel function logs for detailed error messages
3. Test with curl commands to isolate if it's a client or server issue
4. Verify your ElevenLabs account has credits remaining

## Recording Issues

If the microphone isn't working:

1. **Check browser permissions**
   - Your browser needs microphone access
   - Check site settings in your browser

2. **HTTPS required**
   - Microphone only works on HTTPS sites
   - Vercel deployments use HTTPS by default
   - Local development: use `localhost` (not IP address)

3. **Browser compatibility**
   - MediaRecorder API is required
   - Works in Chrome, Firefox, Edge, Safari (iOS 14.3+)
