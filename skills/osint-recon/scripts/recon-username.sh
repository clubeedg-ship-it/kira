#!/bin/bash
# Quick username recon across platforms
# Usage: bash recon-username.sh <username>

USERNAME="${1:?Usage: recon-username.sh <username>}"
OUTDIR="/home/adminuser/kali-osint/reports/${USERNAME}_$(date +%Y%m%d)"
mkdir -p "$OUTDIR"

echo "=== OSINT Recon: $USERNAME ==="
echo "Output: $OUTDIR"
echo ""

# 1. Quick HTTP checks
echo "[1/5] Platform presence check..."
for site in github.com twitter.com x.com tiktok.com youtube.com reddit.com linkedin.com \
            pinterest.com twitch.tv t.me threads.net snapchat.com medium.com; do
    url="https://$site/$USERNAME"
    [[ "$site" == "threads.net" ]] && url="https://www.$site/@$USERNAME"
    [[ "$site" == "tiktok.com" ]] && url="https://www.$site/@$USERNAME"
    [[ "$site" == "t.me" ]] && url="https://$site/$USERNAME"
    code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$url" 2>/dev/null)
    echo "  $site: $code" | tee -a "$OUTDIR/platforms.txt"
done

# 2. Sherlock
echo ""
echo "[2/5] Sherlock (400+ sites)..."
docker exec kali-osint sherlock "$USERNAME" --print-found --no-color 2>&1 | tee "$OUTDIR/sherlock.txt"

# 3. Maigret (background — takes longer)
echo ""
echo "[3/5] Maigret (2669 sites, background)..."
docker exec -d kali-osint bash -c "maigret $USERNAME --timeout 10 --no-color -a > /data/maigret_${USERNAME}.txt 2>&1"
echo "  Running in background → /data/maigret_${USERNAME}.txt"

# 4. Domain check
echo ""
echo "[4/5] Domain check..."
for ext in com net org io eu; do
    result=$(dig +short "${USERNAME}.$ext" 2>/dev/null)
    [[ -n "$result" ]] && echo "  ${USERNAME}.$ext: $result" | tee -a "$OUTDIR/domains.txt"
done

# 5. Telegram check
echo ""
echo "[5/5] Telegram..."
code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "https://t.me/$USERNAME" 2>/dev/null)
echo "  t.me/$USERNAME: $code" | tee -a "$OUTDIR/platforms.txt"

echo ""
echo "=== Quick recon complete. Results in $OUTDIR ==="
echo "Run 'cat /home/adminuser/kali-osint/data/maigret_${USERNAME}.txt' when maigret finishes."
