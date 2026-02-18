# iOS Shortcut: "Talk to Kira"

Complete step-by-step guide to create the voice interface on iPhone.

## Prerequisites

1. **iPhone with A19 chip** (or any iPhone for API-based Whisper)
2. **Whisper app** for local transcription:
   - [Whisper Transcription](https://apps.apple.com/app/whisper-transcription/id1668083311) (free, on-device)
   - Or use OpenAI Whisper API
3. **Your server URL** (where Clawdbot runs)

---

## Shortcut Setup

### Create New Shortcut

1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Name it: **Talk to Kira**

### Add Actions (in order):

#### 1. Record Audio
```
Action: Record Audio
Duration: 30 seconds (or ask each time)
Audio Quality: Normal
```

#### 2. Transcribe with Whisper (Option A: Local)
```
Action: Transcribe with Whisper
Input: Recorded Audio
Language: English (or Auto)
Model: Base (fastest) or Small (better accuracy)
```

**OR Option B: API-based**
```
Action: Get Contents of URL
URL: https://api.openai.com/v1/audio/transcriptions
Method: POST
Headers:
  Authorization: Bearer YOUR_OPENAI_KEY
Request Body: Form
  file: Recorded Audio
  model: whisper-1
```

#### 3. Send to Server
```
Action: Get Contents of URL
URL: https://YOUR_SERVER:3456/voice/process
Method: POST
Headers:
  Content-Type: application/json
Request Body: JSON
{
  "text": [Transcription from step 2],
  "sendToTelegram": true
}
```

#### 4. Parse Response
```
Action: Get Dictionary from Input
Action: Get Dictionary Value
Key: spokenResponse
```

#### 5. Speak Response
```
Action: Speak Text
Input: [spokenResponse from step 4]
Voice: Siri Voice (or your preference)
Wait Until Finished: On
```

**OR Play ElevenLabs TTS:**
```
Action: Get Dictionary Value
Key: ttsUrl

Action: Get Contents of URL
URL: [ttsUrl]

Action: Play Sound
Input: [Audio from URL]
```

---

## Complete Shortcut (Copy-Paste Version)

```
Name: Talk to Kira
Icon: 🎤 (microphone)
Color: Purple

Actions:
1. Record Audio (30 sec)
2. Transcribe Audio (Whisper app)
3. URL: POST https://your-server:3456/voice/process
   Body: {"text": "[Transcription]", "sendToTelegram": true}
4. Get "spokenResponse" from Dictionary
5. Speak Text: [spokenResponse]
```

---

## Add Siri Trigger

1. Open your shortcut
2. Tap the **ⓘ** info button
3. Tap **Add to Siri**
4. Record phrase: **"Talk to Kira"**
5. Save

Now say: **"Hey Siri, talk to Kira"**

---

## Server Setup

On your Clawdbot server:

```bash
# Start the voice server
cd ~/kira/skills/voice-layer
node server.js

# Or run in background
nohup node server.js > /tmp/voice-layer.log 2>&1 &
```

### Expose to Internet

Option 1: **ngrok** (easiest for testing)
```bash
ngrok http 3456
# Use the https://xxx.ngrok.io URL in your shortcut
```

Option 2: **Cloudflare Tunnel**
```bash
cloudflared tunnel --url http://localhost:3456
```

Option 3: **Reverse proxy** (nginx/caddy)
```nginx
# /etc/nginx/sites-available/voice
server {
    listen 443 ssl;
    server_name voice.yourdomain.com;
    
    location /voice/ {
        proxy_pass http://localhost:3456;
    }
}
```

---

## Environment Variables

On your server, set these:

```bash
# ~/.bashrc or systemd service
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="7985502241"
export ELEVENLABS_API_KEY="your-elevenlabs-key"
export VOICE_PORT=3456
```

---

## Test Flow

1. **Test server:**
   ```bash
   curl -X POST https://your-server:3456/voice/process \
     -H "Content-Type: application/json" \
     -d '{"text": "Tell Kira I will check the IAM website tomorrow", "sendToTelegram": false}'
   ```

2. **Test Shortcut:**
   - Open Shortcuts app
   - Run "Talk to Kira"
   - Speak: "Let Kira know I'm reviewing the documents"
   - Check Telegram for the crafted message

3. **Test with Siri:**
   - "Hey Siri, talk to Kira"
   - Speak your message
   - Hear confirmation + check Telegram

---

## Troubleshooting

### Whisper not transcribing
- Check microphone permissions
- Try the "Whisper Transcription" app standalone first
- Fall back to OpenAI API

### Server not responding
- Check server is running: `curl https://your-server:3456/voice/status`
- Check firewall allows port 3456
- Check HTTPS certificate is valid

### Message not appearing in Telegram
- Verify TELEGRAM_BOT_TOKEN is set
- Verify TELEGRAM_CHAT_ID is correct
- Check server logs for errors

### TTS not playing
- Verify ELEVENLABS_API_KEY is set
- Check the ttsUrl in response is valid
- Try playing the URL directly in browser

---

## Advanced: Read Kira's Messages

Create a second shortcut: **"What did Kira say"**

```
1. URL: POST https://your-server:3456/voice/read
   Body: {"count": 3}
2. Get "summary" from Dictionary
3. Speak Text: [summary]
```

Siri trigger: **"Hey Siri, what did Kira say"**

---

## Security Notes

- Use HTTPS for the server endpoint
- Consider adding an API key header for authentication
- Don't expose the server without authentication in production
