#!/bin/bash
# Setup script for NVIDIA 4090 24GB VRAM
# Run this when the GPU is connected

set -e

echo "=== 4090 Setup Script ==="
echo ""

# Check if NVIDIA driver is loaded
echo "1. Checking NVIDIA driver..."
if nvidia-smi &>/dev/null; then
    echo "✅ NVIDIA driver detected"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
else
    echo "❌ NVIDIA driver not found. Install with:"
    echo "   sudo apt install nvidia-driver-535"
    exit 1
fi

echo ""
echo "2. Installing CUDA toolkit..."
if ! command -v nvcc &>/dev/null; then
    echo "Installing CUDA..."
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y nvidia-cuda-toolkit
else
    echo "✅ CUDA already installed: $(nvcc --version | head -1)"
fi

echo ""
echo "3. Installing Ollama (local LLM inference)..."
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama already installed"
fi

echo ""
echo "4. Pulling embedding model..."
ollama pull nomic-embed-text

echo ""
echo "5. Pulling local LLM models..."
# Models that fit in 24GB VRAM
ollama pull llama3.1:70b-instruct-q4_K_M  # ~40GB quantized, fits in VRAM
ollama pull qwen2.5:32b                    # Excellent for coding
ollama pull deepseek-coder-v2:16b          # Fast coding model

echo ""
echo "6. Setting up vLLM for high-throughput inference..."
pip install vllm --upgrade

echo ""
echo "7. Setting up LMCache for persistent KV cache..."
pip install lmcache --upgrade

echo ""
echo "8. Installing Whisper for speech-to-text..."
pip install openai-whisper --upgrade

echo ""
echo "9. Installing voice synthesis..."
pip install TTS --upgrade  # Coqui TTS

echo ""
echo "10. Creating systemd service for Ollama..."
sudo tee /etc/systemd/system/ollama.service > /dev/null << 'EOF'
[Unit]
Description=Ollama LLM Server
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Available models:"
ollama list

echo ""
echo "Test embedding:"
curl -s http://localhost:11434/api/embeddings -d '{"model":"nomic-embed-text","prompt":"hello world"}' | head -c 200

echo ""
echo ""
echo "🎉 4090 is ready! You now have:"
echo "   • Local LLM inference (Llama 3.1 70B, Qwen 32B)"
echo "   • Local embeddings (nomic-embed-text)"
echo "   • Whisper for transcription"
echo "   • TTS for voice synthesis"
echo "   • vLLM for high-throughput serving"
echo "   • LMCache for persistent KV cache"
