import os
import psutil
import requests
import datetime
import shutil

# Configuration
# Read from env or local file
TELEGRAM_BOT_TOKEN = "7919864295:AAEi1YFzKjH4-fL-7Lz1I6V-9y2-0Y4X4X4" # Placeholder - update with real from secrets
TELEGRAM_CHAT_ID = "7985502241" # Otto's Chat ID from TOOLS.md

# Thresholds
CPU_THRESHOLD = 90
RAM_THRESHOLD = 90
DISK_THRESHOLD = 90

def get_system_metrics():
    cpu_usage = psutil.cpu_percent(interval=1)
    ram_usage = psutil.virtual_memory().percent
    disk_usage = psutil.disk_usage('/').percent
    load_avg = os.getloadavg()
    return cpu_usage, ram_usage, disk_usage, load_avg

def send_telegram_alert(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": f"🚨 *Kira VM Alert* 🚨\n\n{message}",
        "parse_mode": "Markdown"
    }
    try:
        # Avoid real network call during dry run or if token is placeholder
        if "X4X4" in TELEGRAM_BOT_TOKEN:
            print(f"[DRY-RUN] Telegram Alert: {message}")
            return
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Failed to send telegram alert: {e}")

def main():
    cpu, ram, disk, load = get_system_metrics()
    alerts = []
    
    if cpu > CPU_THRESHOLD:
        alerts.append(f"High CPU Usage: {cpu}%")
    if ram > RAM_THRESHOLD:
        alerts.append(f"High RAM Usage: {ram}%")
    if disk > DISK_THRESHOLD:
        alerts.append(f"High Disk Usage: {disk}%")
        
    if alerts:
        msg = "\n".join(alerts)
        msg += f"\n\nLoad Avg: {load}"
        send_telegram_alert(msg)
    else:
        print(f"Systems Normal: CPU:{cpu}% RAM:{ram}% Disk:{disk}%")

if __name__ == "__main__":
    main()
