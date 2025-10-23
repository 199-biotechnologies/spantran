# ElevenLabs API Test Results

## Tests Performed: October 23, 2025

### API Key Tested
```
sk_b35839bd45b4e332c9297e54b6e9e7fdc82e18b86b75354c
```

### Test 1: Text-to-Speech (TTS)
**Command:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/scn1gPWkdVd8FhODJoei" \
  -H "xi-api-key: sk_b35839bd45b4e332c9297e54b6e9e7fdc82e18b86b75354c" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola parce, qué más?", "model_id": "eleven_turbo_v2_5"}' \
  -o test_output.mp3
```

**Result:** ❌ FAILED
```json
{
  "detail": {
    "status": "missing_permissions",
    "message": "The API key you used is missing the permission text_to_speech to execute this operation."
  }
}
```
**HTTP Status:** 401 Unauthorized

---

### Test 2: List Voices
**Command:**
```bash
curl -X GET "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: sk_b35839bd45b4e332c9297e54b6e9e7fdc82e18b86b75354c"
```

**Result:** ❌ FAILED
```json
{
  "detail": {
    "status": "missing_permissions", 
    "message": "The API key you used is missing the permission voices_read to execute this operation."
  }
}
```
**HTTP Status:** 401 Unauthorized

---

## Root Cause

**Both API keys tested have insufficient permissions.**

The API keys are missing these required permissions:
- ❌ `text_to_speech` - Required for TTS (speaker button)
- ❌ `voices_read` - Required to list/verify voices
- ❌ `speech_to_text` - Required for STT (microphone button) - not tested but likely also missing

---

## ✅ How to Fix

### Step 1: Update API Key Permissions

1. **Go to ElevenLabs Settings:**
   https://elevenlabs.io/app/settings/api-keys

2. **Find your API key** and click the **pencil icon (edit)**

3. **Enable these permissions:**
   - ✅ `text_to_speech`
   - ✅ `speech_to_text`
   - ✅ `voices_read`

   **OR** turn off **"Restrict Key"** to grant full access

4. **Save the changes**

### Step 2: Verify It Works

After updating permissions, test again:

```bash
# Test TTS
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/scn1gPWkdVd8FhODJoei" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "model_id": "eleven_turbo_v2_5"}' \
  -o test.mp3

# If successful, test.mp3 will contain audio (check with: ls -lh test.mp3)
# If failed, you'll see the same error message
```

### Step 3: Update Vercel

Once the API key has correct permissions:
1. Go to Vercel project settings
2. Update `ELEVENLABS_API_KEY` environment variable
3. Redeploy

---

## Voice ID Status

**Voice ID being used:** `scn1gPWkdVd8FhODJoei`

**Cannot verify if this voice exists** because the `voices_read` permission is missing.

Once you fix the API key permissions, visit:
- **Your deployed app:** `/api/voices`
- This will list all voices in your account
- Verify the voice ID appears in the list
- If not, add it to your Voice Lab at elevenlabs.io/voice-library

---

## Summary

✅ API key is valid (not expired/invalid)
❌ API key lacks required permissions
❌ Cannot test TTS functionality
❌ Cannot verify voice ID exists
❌ Cannot test STT functionality

**Next action:** Update API key permissions at elevenlabs.io/app/settings/api-keys
