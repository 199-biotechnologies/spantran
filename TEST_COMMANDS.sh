#!/bin/bash

# Test commands for ElevenLabs API
# Replace YOUR_API_KEY with your actual API key after fixing permissions

API_KEY="sk_b35839bd45b4e332c9297e54b6e9e7fdc82e18b86b75354c"
VOICE_ID="scn1gPWkdVd8FhODJoei"

echo "========================================="
echo "ElevenLabs API Test Commands"
echo "========================================="
echo ""

echo "1. Testing Text-to-Speech..."
echo "Command:"
echo "curl -X POST \"https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}\" \\"
echo "  -H \"xi-api-key: ${API_KEY}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"text\": \"Hola parce, qué más? Esto es una prueba.\", \"model_id\": \"eleven_turbo_v2_5\"}' \\"
echo "  -o tts_test.mp3"
echo ""

curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola parce, qué más? Esto es una prueba.", "model_id": "eleven_turbo_v2_5"}' \
  -o tts_test.mp3 \
  -w "\nHTTP Status: %{http_code}\n" 2>&1

echo ""
echo "Result saved to: tts_test.mp3"
echo "If successful, file will be audio. If failed, it will contain JSON error."
echo ""
echo "Checking file contents:"
cat tts_test.mp3 2>/dev/null || echo "File not created"
echo ""
echo "========================================="
echo ""

echo "2. Testing List Voices..."
echo "Command:"
echo "curl -X GET \"https://api.elevenlabs.io/v1/voices\" \\"
echo "  -H \"xi-api-key: ${API_KEY}\""
echo ""

curl -X GET "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: ${API_KEY}" \
  -w "\nHTTP Status: %{http_code}\n" 2>&1 | head -20

echo ""
echo "========================================="
echo ""

echo "3. Testing Get Specific Voice..."
echo "Command:"
echo "curl -X GET \"https://api.elevenlabs.io/v1/voices/${VOICE_ID}\" \\"
echo "  -H \"xi-api-key: ${API_KEY}\""
echo ""

curl -X GET "https://api.elevenlabs.io/v1/voices/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -w "\nHTTP Status: %{http_code}\n" 2>&1

echo ""
echo "========================================="
echo "Tests Complete!"
echo ""
echo "If you see 'missing_permissions' errors, you need to:"
echo "1. Go to: https://elevenlabs.io/app/settings/api-keys"
echo "2. Edit your API key (pencil icon)"
echo "3. Enable: text_to_speech, speech_to_text, voices_read"
echo "4. Or disable 'Restrict Key' for full access"
echo "========================================="
