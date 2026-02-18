#!/bin/bash
export LD_LIBRARY_PATH="/tmp/lib/ollama/cuda_v12:$LD_LIBRARY_PATH"
exec python3 /home/adminuser/kira/tools/whisper/transcribe.py --serve
