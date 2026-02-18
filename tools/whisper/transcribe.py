#!/usr/bin/env python3
"""
Local Whisper transcription service.
Usage:
  python3 transcribe.py <audio_file>              # One-shot transcription
  python3 transcribe.py --serve                    # HTTP server on port 3852
  
Outputs JSON: {"text": "...", "language": "en", "duration": 5.2}
"""
import sys
import json
import os
from pathlib import Path

# Lazy-load model (first call downloads ~1GB)
_model = None

def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        # Use large-v3 for best multilingual quality, GPU if available
        device = "cuda" if os.path.exists("/dev/nvidia0") else "cpu"
        compute = "float16" if device == "cuda" else "int8"
        print(f"[whisper] Loading model (device={device}, compute={compute})...", file=sys.stderr)
        model_size = os.environ.get("WHISPER_MODEL", "large-v3")
        _model = WhisperModel(model_size, device=device, compute_type=compute)
        print("[whisper] Model ready", file=sys.stderr)
    return _model

def transcribe(audio_path):
    model = get_model()
    segments, info = model.transcribe(audio_path, beam_size=5)
    text = " ".join(seg.text.strip() for seg in segments)
    return {
        "text": text,
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 2)
    }

def serve(port=3852):
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import tempfile
    
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == '/transcribe':
                content_length = int(self.headers.get('Content-Length', 0))
                audio_data = self.rfile.read(content_length)
                
                # Determine file extension from content-type
                ct = self.headers.get('Content-Type', 'audio/ogg')
                ext_map = {'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/wav': '.wav',
                           'audio/mp4': '.m4a', 'audio/webm': '.webm', 'audio/x-m4a': '.m4a'}
                ext = ext_map.get(ct, '.ogg')
                
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                    f.write(audio_data)
                    tmp_path = f.name
                
                try:
                    result = transcribe(tmp_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
                finally:
                    os.unlink(tmp_path)
            
            elif self.path == '/transcribe-file':
                # Accept JSON with file path
                content_length = int(self.headers.get('Content-Length', 0))
                body = json.loads(self.rfile.read(content_length))
                file_path = body.get('path', '')
                
                if not os.path.exists(file_path):
                    self.send_response(404)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "File not found"}).encode())
                    return
                
                try:
                    result = transcribe(file_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
            else:
                self.send_response(404)
                self.end_headers()
        
        def do_GET(self):
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "model": "large-v3"}).encode())
            else:
                self.send_response(404)
                self.end_headers()
        
        def log_message(self, format, *args):
            print(f"[whisper] {args[0]}", file=sys.stderr)
    
    # Pre-load model
    get_model()
    
    server = HTTPServer(('0.0.0.0', port), Handler)
    print(f"[whisper] Transcription server on http://0.0.0.0:{port}", file=sys.stderr)
    server.serve_forever()

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--serve':
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 3852
        serve(port)
    elif len(sys.argv) > 1:
        result = transcribe(sys.argv[1])
        print(json.dumps(result))
    else:
        print("Usage: python3 transcribe.py <audio_file> | --serve [port]")
