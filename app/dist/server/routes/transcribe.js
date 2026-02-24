import { Router } from 'express';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
export const transcribeRouter = Router();
transcribeRouter.post('/', upload.single('audio'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No audio file provided' });
            return;
        }
        let transcription = null;
        // Prefer local Whisper — sends raw audio body with Content-Type
        const whisperUrl = process.env.WHISPER_URL || 'http://host.docker.internal:3852';
        try {
            const fetchResp = await fetch(`${whisperUrl}/transcribe`, {
                method: 'POST',
                headers: { 'Content-Type': file.mimetype || 'audio/webm' },
                body: new Uint8Array(file.buffer),
                signal: AbortSignal.timeout(30000),
            });
            if (fetchResp.ok) {
                const result = await fetchResp.json();
                transcription = result.text;
            }
            else {
                console.error('Whisper error:', await fetchResp.text());
            }
        }
        catch (e) {
            console.error('Local Whisper unavailable:', e.message);
        }
        // Fallback: Groq API (OpenAI-compatible, uses FormData)
        if (!transcription) {
            const groqKey = process.env.GROQ_API_KEY;
            if (groqKey) {
                const groqForm = new FormData();
                groqForm.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), 'audio.webm');
                groqForm.append('model', 'whisper-large-v3-turbo');
                const groqResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqKey}` },
                    body: groqForm,
                });
                if (groqResp.ok) {
                    const result = await groqResp.json();
                    transcription = result.text;
                }
            }
        }
        if (!transcription) {
            res.status(502).json({ error: 'Transcription failed — no service available' });
            return;
        }
        // SSE word-by-word streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const words = transcription.split(/\s+/).filter(w => w.length > 0);
        for (const word of words) {
            res.write(`data: ${JSON.stringify({ type: 'word', text: word })}\n\n`);
            await new Promise(r => setTimeout(r, 50));
        }
        res.write(`data: ${JSON.stringify({ type: 'done', fullText: transcription })}\n\n`);
        res.end();
    }
    catch (err) {
        console.error('Transcribe error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
        else {
            res.end();
        }
    }
});
//# sourceMappingURL=transcribe.js.map