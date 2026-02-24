# TASK 023 — Voice Input & Transcription

## Agent Instructions

You are building **voice input** for Kira's chat — users can speak instead of type, and their speech is transcribed and sent as a message.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/screens/mobile/chat-mobile.md` — mobile chat with voice
3. `src/client/pages/Chat.tsx` — existing chat page (TASK 016)
4. `src/server/routes/chat.ts` — existing chat routes

**What you're building:**

### Backend Route (`src/server/routes/chat.ts`)

Add:
- `POST /api/v1/chat/transcribe` — accepts `multipart/form-data` with an `audio` file field (webm/ogg/mp4)
- Sends audio to transcription provider (configurable):
  - **Option A (default for hosted):** OpenAI Whisper API (`https://api.openai.com/v1/audio/transcriptions`)
  - **Option B (self-hosted):** Configurable endpoint URL (env var `WHISPER_ENDPOINT`)
- Returns `{ data: { text: string, confidence: number, duration_ms: number } }`
- Max file size: 25MB
- Supported formats: webm, ogg, mp4, wav, m4a

### Frontend: Voice Button (`src/client/components/VoiceInput.tsx`)

**Mic button** — positioned in the chat input bar, right side, before the Send button.

**States:**
1. **Idle**: Mic icon (gray). Click or press `Cmd+J`/`Ctrl+J` to start recording.
2. **Recording**: Mic icon pulses red. Waveform animation below/beside the input. Timer shows duration (0:01, 0:02...).
3. **Processing**: Spinner replaces mic. "Transcribing..." text.
4. **Done**: Transcribed text fills the textarea. User can edit before sending.

**Recording Implementation:**
```typescript
// Use MediaRecorder API
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
```

**Silence detection:**
- Use `AnalyserNode` from Web Audio API to monitor volume
- If RMS volume < threshold for 3 continuous seconds → auto-stop recording
- Visual feedback: waveform flatlines during silence, countdown indicator "Sending in 3... 2... 1..."

**Error handling:**
- Mic permission denied → show message: "Microphone access needed for voice input. Click the lock icon in your browser to enable."
- Transcription failed → show error toast + keep recording available for retry
- No mic available → hide mic button entirely

### Waveform Animation (`src/client/components/Waveform.tsx`)

- Uses `AnalyserNode.getByteTimeDomainData()` for real-time audio visualization
- Canvas element, ~200×40px, positioned above the input bar during recording
- Simple waveform: center-line with amplitude bars, primary color, smooth animation
- Light/performant: `requestAnimationFrame` loop, stopped when not recording

### Keyboard Shortcut

In `src/client/hooks/useGlobalShortcuts.ts` (or create if doesn't exist):
- `Cmd+J` / `Ctrl+J` → toggle voice recording
- If already recording → stop and transcribe
- If not recording → start recording
- Works from any page (navigates to chat if not already there)

### Integration with Chat

After transcription completes:
1. Text fills the `<textarea>` in chat
2. Textarea auto-focuses so user can review/edit
3. User presses Enter to send (NOT auto-send — user should review transcription)
4. If user presses Cmd+J again immediately (without editing) → could auto-send for power users (optional, configurable)

### Mobile Considerations

- Mic button: larger on mobile (48×48px), prominent position
- On mobile, consider a "hold to record" interaction as alternative to toggle
- Waveform: full-width above input on mobile
- Handle iOS Safari's MediaRecorder limitations (may need polyfill or fallback)

## Commit Format
```
build(TASK-023): Voice input with waveform and silence detection
```

## Acceptance Test
```bash
# 1. Basic flow
# Click mic → allow permission → speak "Create a task for tomorrow" → stop → text appears in input → press Enter → message sent

# 2. Silence auto-stop
# Click mic → speak → stop speaking → wait 3s → recording auto-stops → transcription starts

# 3. Keyboard shortcut
# Press Cmd+J → recording starts → press Cmd+J again → recording stops → transcription

# 4. Edit before send
# Record → transcription appears → manually fix a word → send

# 5. Error handling
# Deny mic permission → helpful message appears
# Kill transcription endpoint → error toast + retry option

# 6. Mobile
# On mobile browser → mic button is large and tappable → waveform visible → works end-to-end

# 7. Waveform
# During recording → waveform animates with voice → flatlines during silence
```
