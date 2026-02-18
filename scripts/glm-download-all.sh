#!/bin/bash
# Download all remaining GLM-4.7-Flash shards with aria2c
# Runs 4 parallel downloads at a time

MODEL_DIR="/home/adminuser/models/glm-4.7-flash"
BASE_URL="https://huggingface.co/zai-org/GLM-4.7-Flash/resolve/main"
MAX_PARALLEL=4

cd "$MODEL_DIR"

for i in $(seq 1 48); do
    SHARD=$(printf "%05d" $i)
    FILE="model-${SHARD}-of-00048.safetensors"
    
    if [ -f "$FILE" ]; then
        echo "✓ $FILE exists"
        continue
    fi
    
    # Wait if we have too many running
    while [ $(pgrep -c aria2c) -ge $MAX_PARALLEL ]; do
        sleep 5
    done
    
    echo "⬇️ Downloading $FILE..."
    aria2c -q -x 16 -s 16 --auto-file-renaming=false \
        --continue=true --max-tries=10 --retry-wait=5 \
        "$BASE_URL/$FILE" -o "$FILE" &
done

# Wait for all to complete
wait
echo "✅ All shards downloaded!"
ls *.safetensors | wc -l
