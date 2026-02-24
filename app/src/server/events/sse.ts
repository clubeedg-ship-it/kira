import type { Express, Response } from 'express';
import Redis from 'ioredis';

const KEEP_ALIVE_INTERVAL_MS = 30_000;
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const CHANNEL_ALIASES: Record<string, string> = {
  inbox: 'input_queue',
};

interface RedisEventMessage {
  channel: string;
  data: unknown;
  timestamp: string;
  type: string;
}

const eventPublisher = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

eventPublisher.on('error', (error) => {
  console.error('Redis SSE publisher error.', error);
});

function getUserEventChannel(userId: string): string {
  return `events:${userId}`;
}

function normalizeChannel(channel: string): string {
  const normalized = channel.trim().toLowerCase();
  return CHANNEL_ALIASES[normalized] ?? normalized;
}

function parseChannels(rawChannels: unknown): Set<string> | null {
  if (Array.isArray(rawChannels)) {
    rawChannels = rawChannels.join(',');
  }

  if (typeof rawChannels !== 'string') {
    return null;
  }

  const channels = rawChannels
    .split(',')
    .map((channel) => normalizeChannel(channel))
    .filter((channel) => channel.length > 0 && channel !== 'all');

  if (channels.length === 0) {
    return null;
  }

  return new Set(channels);
}

function writeSseEvent(res: Response, type: string, data: unknown): void {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function emitEvent(userId: string, channel: string, type: string, data: unknown): void {
  const message: RedisEventMessage = {
    channel: normalizeChannel(channel),
    data,
    timestamp: new Date().toISOString(),
    type,
  };

  void eventPublisher
    .publish(getUserEventChannel(userId), JSON.stringify(message))
    .catch((error) => {
      console.error(`Failed to publish SSE event \"${type}\" for user ${userId}.`, error);
    });
}

export function emitUserEvent(userId: string, type: string, data: unknown): void {
  const [channelPrefix = 'system'] = type.split('.');
  emitEvent(userId, channelPrefix, type, data);
}

export async function closeEventPublisher(): Promise<void> {
  try {
    await eventPublisher.quit();
  } catch {
    // Ignore close errors in short-lived scripts.
  }
}

export function registerSseRoute(app: Express): void {
  app.get('/api/v1/events/stream', async (req, res) => {
    if (!req.userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const subscribedChannels = parseChannels(req.query.channels);
    const subscriber = eventPublisher.duplicate({
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    const redisUserChannel = getUserEventChannel(req.userId);
    let keepAlive: NodeJS.Timeout | null = null;
    let isClosed = false;

    const cleanup = () => {
      if (isClosed) {
        return;
      }

      isClosed = true;

      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }

      subscriber.removeListener('message', onMessage);

      void subscriber
        .unsubscribe(redisUserChannel)
        .catch(() => {})
        .finally(() => {
          void subscriber.quit().catch(() => {});
        });
    };

    const onMessage = (_channel: string, message: string) => {
      let parsedMessage: Partial<RedisEventMessage> | null = null;

      try {
        parsedMessage = JSON.parse(message) as Partial<RedisEventMessage>;
      } catch {
        return;
      }

      if (!parsedMessage || typeof parsedMessage.type !== 'string') {
        return;
      }

      const eventChannel =
        typeof parsedMessage.channel === 'string'
          ? normalizeChannel(parsedMessage.channel)
          : normalizeChannel(parsedMessage.type.split('.')[0] ?? 'system');

      if (subscribedChannels && !subscribedChannels.has(eventChannel)) {
        return;
      }

      try {
        writeSseEvent(res, parsedMessage.type, parsedMessage.data ?? null);
      } catch {
        cleanup();
      }
    };

    subscriber.on('error', (error) => {
      console.error('Redis SSE subscriber error.', error);
    });
    subscriber.on('message', onMessage);

    try {
      await subscriber.subscribe(redisUserChannel);
    } catch (error) {
      console.error('Unable to subscribe to SSE Redis channel.', error);
      cleanup();
      res.status(500).end();
      return;
    }

    keepAlive = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch {
        cleanup();
      }
    }, KEEP_ALIVE_INTERVAL_MS);

    req.on('aborted', cleanup);
    req.on('close', cleanup);
  });
}
