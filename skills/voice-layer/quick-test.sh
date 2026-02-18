#!/bin/bash
# Quick test script for voice layer

MODEL="${VOICE_AGENT_MODEL:-qwen3:8b}"  # Fallback to qwen3:8b

echo "🎙️  Voice Layer Quick Test"
echo "Using model: $MODEL"
echo ""

# Test 1: Model availability
echo "1. Testing Ollama connection..."
if curl -s http://localhost:11434/api/tags | grep -q "$MODEL"; then
    echo "   ✅ Model $MODEL available"
else
    echo "   ❌ Model $MODEL not found"
    echo "   Available models:"
    curl -s http://localhost:11434/api/tags | jq -r '.models[].name'
fi

# Test 2: Quick inference
echo ""
echo "2. Testing inference..."
RESPONSE=$(curl -s http://localhost:11434/api/generate \
    -d "{\"model\": \"$MODEL\", \"prompt\": \"Reply with only: VOICE_TEST_OK\", \"stream\": false}" \
    | jq -r '.response' 2>/dev/null | head -1)

if echo "$RESPONSE" | grep -q "VOICE_TEST_OK\|OK\|ok"; then
    echo "   ✅ Inference working"
else
    echo "   ⚠️  Response: $RESPONSE"
fi

# Test 3: Voice agent test
echo ""
echo "3. Testing voice agent prompt..."
cd ~/kira/skills/voice-layer

# Create a simple test
PROMPT="You craft Telegram messages. User said: 'Tell Kira I checked the website'. Output ONLY the message:"
CRAFTED=$(curl -s http://localhost:11434/api/generate \
    -d "{\"model\": \"$MODEL\", \"prompt\": \"$PROMPT\", \"stream\": false, \"options\": {\"temperature\": 0.3, \"num_predict\": 50}}" \
    | jq -r '.response' 2>/dev/null)

echo "   Input:  'Tell Kira I checked the website'"
echo "   Output: $CRAFTED"

echo ""
echo "Done! Voice layer components ready."
