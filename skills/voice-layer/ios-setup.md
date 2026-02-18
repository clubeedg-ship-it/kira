# iOS Setup for Voice Layer

## Option 1: Whisper via Shortcuts (Recommended)

### Required Apps
1. **Shortcuts** (built-in)
2. **Whisper Transcription** or **MacWhisper** (for on-device Whisper)
3. **Scriptable** (for advanced automation)

### Shortcut: "Hey Kira"

Create a Shortcut with these actions:

```
1. Record Audio (30 seconds max)
2. Save to Files (iCloud/Clawdbot/voice/recording.wav)
3. Run Whisper Transcription
4. Save Transcription to Files (iCloud/Clawdbot/voice/transcription.txt)
5. Get Contents of URL (your voice-layer endpoint)
6. Speak Text (response)
```

### Siri Trigger
1. Go to Shortcut settings
2. Add to Siri: "Hey Kira"
3. Now say "Hey Siri, Hey Kira" to activate

### Alternative: Single Shortcut
```
Name: Kira Voice
Trigger: "Hey Siri, talk to Kira"

Actions:
1. Ask for Input (Speech) → variable: userInput
2. Get File (iCloud/Clawdbot/context/latest-kira.txt)
3. Combine: userInput + context
4. Run Script (Scriptable) → processes with LLM
5. Speak Text (crafted response)
6. Send Message → Telegram
```

---

## Option 2: Clawdbot Node on iPhone

If you have Clawdbot Node running on iPhone:

### Setup
```bash
# In Clawdbot config, enable voice layer
clawdbot config set voice.enabled true
clawdbot config set voice.whisper.mode ios
clawdbot config set voice.tts.provider elevenlabs
```

### Trigger
- Use iOS Shortcut to trigger: `clawdbot voice start`
- Or background daemon with wake word detection

---

## Option 3: Web Interface

### PWA with Microphone Access
1. Create a simple web page at `https://yourdomain.com/voice`
2. Add to Home Screen
3. Request microphone permission
4. Use Web Speech API or Whisper.js for STT

```html
<!-- voice.html -->
<button id="listen">🎤 Talk to Kira</button>
<script>
  const btn = document.getElementById('listen');
  btn.onclick = async () => {
    const recognition = new webkitSpeechRecognition();
    recognition.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      // Send to your voice-layer endpoint
      const response = await fetch('/voice/process', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      const result = await response.json();
      // Speak response
      const utterance = new SpeechSynthesisUtterance(result.message);
      speechSynthesis.speak(utterance);
    };
    recognition.start();
  };
</script>
```

---

## File Sync

### iCloud Drive Paths
```
iCloud Drive/
└── Clawdbot/
    └── voice/
        ├── recording.wav      # Latest voice recording
        ├── transcription.txt  # Latest transcription
        ├── response.txt       # Latest crafted response
        └── context/
            └── latest-kira.txt  # Latest Kira messages
```

### Sync with Server
Use iCloud sync or manual upload via Shortcuts:
```
Get File → Upload to your server
```

---

## ElevenLabs on iOS

### Via API (Shortcut)
```
1. Get transcription text
2. URL: https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
3. Method: POST
4. Headers: xi-api-key: YOUR_KEY
5. Body: {"text": "...", "model_id": "eleven_multilingual_v2"}
6. Save Response (audio) to Files
7. Play Sound (file)
```

### Via App
- Use ElevenLabs Reader app
- Or Scriptable with audio playback

---

## Quick Start

1. Install Whisper Transcription app
2. Create "Hey Kira" Shortcut
3. Test: "Hey Siri, Hey Kira"
4. Say something → See transcription
5. Connect to voice-layer server for full loop
