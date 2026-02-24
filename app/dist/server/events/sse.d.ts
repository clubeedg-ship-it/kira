import type { Express } from 'express';
export declare function emitEvent(userId: string, channel: string, type: string, data: unknown): void;
export declare function emitUserEvent(userId: string, type: string, data: unknown): void;
export declare function closeEventPublisher(): Promise<void>;
export declare function registerSseRoute(app: Express): void;
