#!/bin/bash
# Fast GLM-4.7-Flash download using aria2c

MODEL_DIR="/home/adminuser/models/glm-4.7-flash"
BASE_URL="https://huggingface.co/zai-org/GLM-4.7-Flash/resolve/main"
mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

echo "=== Downloading GLM-4.7-Flash with aria2c ==="

# Download config files first
for file in config.json tokenizer.json tokenizer_config.json generation_config.json; do
    if [ ! -f "$file" ]; then
        echo "Downloading $file..."
        aria2c -x 16 -s 16 --auto-file-renaming=false "$BASE_URL/$file" -o "$file"
    fi
done

# Download safetensors (48 shards, ~1.2GB each)
for i in $(seq 1 48); do
    SHARD=$(printf "%05d" $i)
    FILE="model-${SHARD}-of-00048.safetensors"
    
    if [ -f "$FILE" ]; then
        echo "✓ $FILE already exists"
    else
        echo "Downloading $FILE..."
        aria2c -x 16 -s 16 -j 4 --auto-file-renaming=false \
            --continue=true \
            --max-tries=10 \
            --retry-wait=5 \
            "$BASE_URL/$FILE" -o "$FILE"
    fi
done

echo "=== Download complete ==="
ls -lh *.safetensors | wc -l
du -sh .
