#!/bin/bash
# Setup or restart the Kali OSINT container
# Usage: bash setup-kali.sh

set -e

CONTAINER_NAME="kali-osint"
IMAGE_NAME="kali-osint"
DATA_DIR="/home/adminuser/kali-osint/data"
REPORTS_DIR="/home/adminuser/kali-osint/reports"

# Check if image exists
if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
    echo "[*] Building kali-osint image..."
    
    TMPDIR=$(mktemp -d)
    cat > "$TMPDIR/Dockerfile" << 'DOCKERFILE'
FROM kalilinux/kali-rolling:latest
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git curl wget jq whois dnsutils nmap \
    chromium chromium-driver tor proxychains4 \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages \
    sherlock-project maigret holehe h8mail
RUN curl -sSL "https://raw.githubusercontent.com/sundowndev/phoneinfoga/master/support/scripts/install" | bash && \
    mv phoneinfoga /usr/local/bin/ 2>/dev/null || true
RUN mkdir -p /data /reports
WORKDIR /data
CMD ["/bin/bash"]
DOCKERFILE
    
    docker build -t "$IMAGE_NAME" "$TMPDIR"
    rm -rf "$TMPDIR"
fi

# Create data dirs
mkdir -p "$DATA_DIR" "$REPORTS_DIR"

# Start or restart container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[*] Container exists, starting..."
    docker start "$CONTAINER_NAME"
else
    echo "[*] Creating container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --hostname kali \
        --restart unless-stopped \
        -v "$DATA_DIR:/data" \
        -v "$REPORTS_DIR:/reports" \
        "$IMAGE_NAME" \
        sleep infinity
fi

echo "[+] Container ready:"
docker ps --filter "name=$CONTAINER_NAME" --format '  {{.Names}}: {{.Status}}'

# Verify tools
echo "[*] Tool check:"
docker exec "$CONTAINER_NAME" bash -c '
for cmd in sherlock maigret holehe h8mail phoneinfoga nmap whois tor chromium; do
    if command -v $cmd &>/dev/null; then echo "  ✅ $cmd"; else echo "  ❌ $cmd"; fi
done'
