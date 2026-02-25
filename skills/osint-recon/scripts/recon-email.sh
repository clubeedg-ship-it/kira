#!/bin/bash
# Email OSINT recon
# Usage: bash recon-email.sh <email>

EMAIL="${1:?Usage: recon-email.sh <email>}"

echo "=== Email OSINT: $EMAIL ==="

# 1. Holehe - service detection
echo ""
echo "[1/2] Holehe — registered services..."
docker exec kali-osint holehe "$EMAIL" --no-color 2>&1 | grep -E "^\[[\+\-]" | sort

# 2. h8mail - breach search
echo ""
echo "[2/2] h8mail — breach search..."
docker exec kali-osint h8mail -t "$EMAIL" 2>&1 | tail -20

echo ""
echo "=== Email recon complete ==="
