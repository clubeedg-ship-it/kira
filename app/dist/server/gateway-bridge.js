/**
 * Gateway WebSocket Bridge
 *
 * Connects to OpenClaw gateway via WS, subscribes to chat events,
 * and tracks real-time agent activity state. Exposes this to SSE clients.
 * Also captures assistant responses to save to chat.db.
 */
import WebSocket from 'ws';
let ws = null;
let reconnectTimer = null;
const sseClients = [];
let currentActivity = { state: 'idle', updatedAt: Date.now() };
let rpcIdCounter = 0;
// Callback for saving messages to chat.db
let onFinalMessage = null;
// Track user input per session for Mem0 context pairing
const userInputBySession = new Map();
const GATEWAY_WS_URL = process.env.OPENCLAW_GATEWAY_WS || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'cf56f0d0881f98620828918a6b1d782344483ee54713b226';
function broadcastSSE(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (let i = sseClients.length - 1; i >= 0; i--) {
        try {
            sseClients[i].res.write(msg);
        }
        catch {
            sseClients.splice(i, 1);
        }
    }
}
function setActivity(partial) {
    currentActivity = { ...currentActivity, ...partial, updatedAt: Date.now() };
    broadcastSSE('activity', currentActivity);
}
function broadcastChat(evt) {
    broadcastSSE('chat', evt);
}
function sendConnect(nonce) {
    if (!ws || ws.readyState !== WebSocket.OPEN)
        return;
    const frame = {
        type: 'req',
        method: 'connect',
        id: `req-${++rpcIdCounter}`,
        params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
                id: 'gateway-client',
                displayName: 'Kira Dashboard',
                version: '1.0.0',
                platform: 'linux',
                mode: 'backend',
            },
            auth: { token: GATEWAY_TOKEN },
            role: 'operator',
            scopes: ['operator.admin'],
            caps: ['tool-events'],
        },
    };
    ws.send(JSON.stringify(frame));
}
function connect() {
    if (ws) {
        try {
            ws.close();
        }
        catch { }
    }
    try {
        ws = new WebSocket(GATEWAY_WS_URL);
    }
    catch (err) {
        console.log('[gateway-bridge] WS connect error, retrying in 5s');
        scheduleReconnect();
        return;
    }
    ws.on('open', () => {
        console.log('[gateway-bridge] Connected to OpenClaw gateway WS');
    });
    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'event' && msg.event === 'connect.challenge') {
                console.log('[gateway-bridge] Got challenge, sending connect');
                sendConnect(msg.payload?.nonce);
                return;
            }
            if (msg.type === 'res') {
                if (msg.ok)
                    console.log('[gateway-bridge] Authenticated successfully');
                else
                    console.log('[gateway-bridge] Connect rejected:', JSON.stringify(msg.error || msg).slice(0, 200));
                return;
            }
            if (msg.type === 'event') {
                if (msg.event === 'chat')
                    handleChatEvent(msg.payload);
                return;
            }
        }
        catch { }
    });
    ws.on('close', (code, reason) => {
        console.log('[gateway-bridge] WS closed code=' + code + ' reason=' + reason?.toString());
        ws = null;
        setActivity({ state: 'idle' });
        scheduleReconnect();
    });
    ws.on('error', (err) => {
        console.log('[gateway-bridge] WS error:', err.message);
    });
}
function scheduleReconnect() {
    if (reconnectTimer)
        return;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 5000);
}
function handleChatEvent(payload) {
    if (!payload)
        return;
    const { state, runId, sessionKey, message } = payload;
    // Capture user input if present in the payload (varies by gateway version)
    const userInput = payload.userMessage?.content?.[0]?.text
        || payload.userMessage?.text
        || payload.input?.text
        || payload.prompt;
    if (userInput && sessionKey) {
        userInputBySession.set(sessionKey, userInput);
    }
    switch (state) {
        case 'delta': {
            const text = message?.content?.[0]?.text || '';
            setActivity({
                state: 'streaming', sessionKey, runId, text, toolName: undefined,
                startedAt: currentActivity.startedAt || Date.now(),
            });
            // Forward delta to SSE clients for real-time rendering
            broadcastChat({ type: 'delta', runId, sessionKey, text });
            break;
        }
        case 'final': {
            const text = message?.content?.[0]?.text || '';
            // Retrieve captured user input for this session
            const capturedUserInput = sessionKey ? userInputBySession.get(sessionKey) : undefined;
            if (sessionKey)
                userInputBySession.delete(sessionKey);
            // Forward final message
            broadcastChat({ type: 'final', runId, sessionKey, text });
            // Save to chat.db if we have a callback
            if (text && onFinalMessage) {
                onFinalMessage(text, runId, capturedUserInput);
            }
            setActivity({
                state: 'idle', runId: undefined, sessionKey: undefined, text: undefined,
                toolName: undefined, toolArgs: undefined, startedAt: undefined,
            });
            break;
        }
        case 'error': {
            broadcastChat({ type: 'error', runId, sessionKey, error: payload.error || 'Unknown error' });
            setActivity({
                state: 'idle', runId: undefined, sessionKey: undefined, text: undefined,
                toolName: undefined, toolArgs: undefined, startedAt: undefined,
            });
            break;
        }
        default: {
            // For unknown states with a runId, assume thinking
            if (runId) {
                setActivity({ state: 'thinking', sessionKey, runId, startedAt: currentActivity.startedAt || Date.now() });
                broadcastChat({ type: 'thinking', runId, sessionKey });
            }
        }
    }
}
// Called from server to register the DB save callback
export function setOnFinalMessage(cb) {
    onFinalMessage = cb;
}
// Proxy notifications (supplements WS events for locally-proxied streams)
export function notifyStreamStart(runId) {
    setActivity({ state: 'thinking', runId, startedAt: Date.now(), text: undefined, toolName: undefined });
}
export function notifyStreamDelta(runId, accumulatedText) {
    setActivity({ state: 'streaming', runId, text: accumulatedText });
}
export function notifyStreamEnd() {
    setActivity({ state: 'idle', runId: undefined, text: undefined, toolName: undefined, toolArgs: undefined, startedAt: undefined });
}
export function getActivity() { return { ...currentActivity }; }
export function addSSEClient(res) {
    const id = Math.random().toString(36).slice(2);
    sseClients.push({ id, res });
    return id;
}
export function removeSSEClient(id) {
    const idx = sseClients.findIndex(c => c.id === id);
    if (idx >= 0)
        sseClients.splice(idx, 1);
}
export function initGatewayBridge() {
    connect();
    console.log('[gateway-bridge] Initialized');
}
//# sourceMappingURL=gateway-bridge.js.map