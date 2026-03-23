const os = require('os');
const { execSync } = require('child_process');

// Thresholds
const CPU_THRESHOLD = 90;
const RAM_THRESHOLD = 90;
const DISK_THRESHOLD = 90;

// Config (Read from environment or set as placeholder)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7919864295:AAEi1YFzKjH4-fL-7Lz1I6V-9y2-0Y4X4X4";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "7985502241";

async function getMetrics() {
    const loadAvg = os.loadavg()[0]; // 1 min avg
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

    // Disk usage via shell
    let diskUsagePercent = 0;
    try {
        const dfOutput = execSync("df / --output=pcent | tail -1").toString().trim();
        diskUsagePercent = parseInt(dfOutput.replace('%', ''));
    } catch (e) {
        console.error("Failed to get disk usage", e);
    }

    return {
        loadAvg,
        ram: usedMemPercent,
        disk: diskUsagePercent
    };
}

async function sendAlert(message) {
    console.log(`[ALERT] ${message}`);
    if (TELEGRAM_BOT_TOKEN.includes("X4X4")) {
        console.log("[DRY-RUN] Skipping Telegram call.");
        return;
    }
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: `🚨 *Kira VM Alert* 🚨\n\n${message}`,
        parse_mode: "Markdown"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.error(`Telegram API error: ${response.statusText}`);
        }
    } catch (e) {
        console.error("Failed to fetch Telegram API", e);
    }
}

async function main() {
    const metrics = await getMetrics();
    let alerts = [];

    if (metrics.ram > RAM_THRESHOLD) alerts.push(`High RAM: ${metrics.ram.toFixed(2)}%`);
    if (metrics.disk > DISK_THRESHOLD) alerts.push(`High Disk: ${metrics.disk}%`);
    if (metrics.loadAvg > (os.cpus().length * 0.9)) alerts.push(`High Load Avg: ${metrics.loadAvg.toFixed(2)}`);

    if (alerts.length > 0) {
        await sendAlert(alerts.join("\n"));
    } else {
        console.log(`Systems Normal: RAM:${metrics.ram.toFixed(2)}% Disk:${metrics.disk}% Load:${metrics.loadAvg.toFixed(2)}`);
    }
}

main().catch(console.error);
