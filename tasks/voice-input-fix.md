# Voice Input Fix — Long Recording Loss Bug

## Problem
Voice recordings ~2+ minutes would lose the user's message.

## Root Cause (found in `~/kira/dashboard/public/index.html`)

The Kira dashboard uses **MediaRecorder → server-side Whisper** (not Web Speech API). Multiple issues:

1. **Silence timeout too aggressive (3s)** — `SILENCE_TIMEOUT = 3000` meant any 3-second pause auto-sent the recording. Natural speech pauses easily hit this, especially when thinking mid-sentence.

2. **Timeslice too granular (100ms)** — `voiceMediaRecorder.start(100)` created ~1200 chunks for a 2-minute recording. While Blob creation handles this, it's unnecessary overhead.

3. **AudioContext not stored globally** — `audioCtx` was a local variable in `toggleVoiceRecording()`, making it eligible for garbage collection. If GC'd, the analyser stops getting data → all frequency values drop to 0 → silence detection triggers → auto-send.

4. **`stopVoiceRecording()` was synchronous** — `MediaRecorder.stop()` is async; the `ondataavailable` for the final chunk fires after `stop()`. The old code waited only 200ms which could miss the final data flush, resulting in incomplete audio → failed or truncated transcription.

5. **No max recording cap** — No upper limit, so browser memory could grow unbounded.

## Changes Applied

File: `~/kira/dashboard/public/index.html`

- `SILENCE_TIMEOUT`: 3000 → **8000ms** (8 seconds — tolerates natural pauses)
- `SILENCE_THRESHOLD`: 15 → **12** (slightly more sensitive)
- `start(100)` → `start(1000)` (1-second timeslice, fewer chunks)
- **Stored `voiceAudioCtx` globally** to prevent garbage collection
- **`stopVoiceRecording()` now returns a Promise** that waits for `MediaRecorder.onstop` event, ensuring all chunks are flushed before creating the Blob
- **Added 5-minute max recording timer** (`MAX_RECORDING_MS = 300000`)
- Proper cleanup of AudioContext on stop
- `cancelVoiceRecording` now awaits stop

## Not affected
- The OpenClaw webchat is a native SwiftUI app (macOS/iOS) — no web voice code there
- The admin dashboard (`admin-dashboard/ui/`) has no voice input
- Server-side transcription endpoint (`/api/transcribe`) looked fine — no size limits
