# Voice Layer Skill

Voice-first NLP interface for Kira. Transforms text messages into summarized voice, and voice responses into crafted text messages.

## Features

- **Wake word**: "Hey Kira" activation
- **STT**: Whisper (local on device or API)
- **TTS**: ElevenLabs for natural voice output
- **RAG**: Query memory graph for context
- **Web search**: Verify terminology and facts
- **Telegram**: Send crafted messages as user

## Architecture

```
[Otto speaks] → [Whisper STT] → [Voice Agent] → [Craft message]
                                      ↓
                              [RAG + Web Search]
                                      ↓
                              [Send to Telegram]
                                      ↓
[Kira responds] → [Summarize] → [ElevenLabs TTS] → [Otto hears]
```

## Setup

### On iPhone (A19)

1. Install Whisper-compatible app (e.g., Whisper Transcription, MacWhisper)
2. Or use Shortcuts + Whisper API
3. Configure ElevenLabs API key

### Configuration

```bash
# In ~/.config/clawdbot/voice-layer.json
{
  "whisper": {
    "mode": "local",           # or "api"
    "model": "base",           # base, small, medium, large
    "language": "en"
  },
  "elevenlabs": {
    "voice_id": "your-voice-id",
    "model": "eleven_multilingual_v2"
  },
  "telegram": {
    "send_as_user": true       # Message appears from Otto, not Kira
  },
  "rag": {
    "enabled": true,
    "memory_db": "~/chimera/memory/graph.db"
  },
  "web_search": {
    "enabled": true,
    "verify_terms": true
  }
}
```

## Usage

### Via Clawdbot Node (Phone)

```bash
# Start voice layer
clawdbot voice start

# Stop
clawdbot voice stop
```

### Via Script

```bash
node ~/kira/skills/voice-layer/voice-layer.js
```

### Commands

- "Hey Kira" — Activate listening
- "Hey Kira, read messages" — Read latest Kira messages
- "Hey Kira, respond to that" — Start crafting response
- "Hey Kira, search for [term]" — Web search
- "Hey Kira, what do we know about [topic]" — RAG query
- "Send it" — Send crafted message

## Files

- `voice-layer.js` — Main orchestrator
- `stt.js` — Speech-to-text (Whisper)
- `tts.js` — Text-to-speech (ElevenLabs)
- `rag.js` — Memory graph queries
- `telegram-bridge.js` — Telegram integration
- `voice-agent.js` — Conversation + message crafting

## Dependencies

```bash
npm install whisper-node @anthropic-ai/sdk node-fetch
```

Or use API-based Whisper (no local deps).
