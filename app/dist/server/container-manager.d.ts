/**
 * Persistent Container Manager — manages per-user Docker containers
 * for the code execution sandbox.
 */
export interface ContainerInfo {
    containerId: string;
    status: 'creating' | 'running' | 'paused' | 'stopped';
    ports: Record<string, string>;
}
export declare function ensureContainer(userId: string): Promise<ContainerInfo>;
export declare function execInContainer(userId: string, command: string, timeout?: number): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
}>;
export declare function readContainerFile(userId: string, filePath: string): Promise<string>;
export declare function writeContainerFile(userId: string, filePath: string, content: string): Promise<void>;
export declare function listContainerDir(userId: string, dir?: string): Promise<string[]>;
export declare function startServer(userId: string, command: string, port: number): Promise<string>;
export declare function pauseContainer(userId: string): Promise<void>;
export declare function destroyContainer(userId: string): Promise<void>;
