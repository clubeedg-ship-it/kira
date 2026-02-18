#!/bin/bash
# vLLM Server for GLM-4.7-Flash
# Serves model on OpenAI-compatible API

MODEL_PATH="/home/adminuser/models/glm-4.7-flash"
PORT=8000

source ~/.venv/ml/bin/activate

echo "Starting vLLM server for GLM-4.7-Flash..."
echo "API will be at http://localhost:$PORT/v1"

python -m vllm.entrypoints.openai.api_server \
  --model "$MODEL_PATH" \
  --trust-remote-code \
  --port $PORT \
  --gpu-memory-utilization 0.9 \
  --max-model-len 8192
