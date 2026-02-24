/**
 * Code Execution Sandbox — backed by persistent per-user Docker containers
 *
 * This module preserves the original interface (executeCode, listWorkspaceFiles,
 * readWorkspaceFile, writeWorkspaceFile) but delegates to the container manager
 * for persistent sandboxes instead of disposable `docker run` invocations.
 */
interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    durationMs: number;
}
export declare function executeCode(userId: string, code: string, language?: 'bash' | 'python' | 'javascript' | 'node'): Promise<ExecResult>;
/**
 * List files in user's persistent container workspace
 */
export declare function listWorkspaceFiles(userId: string): Promise<string[]>;
/**
 * Read file from user's persistent container workspace
 */
export declare function readWorkspaceFile(userId: string, filename: string): Promise<string | null>;
/**
 * Write file to user's persistent container workspace
 */
export declare function writeWorkspaceFile(userId: string, filename: string, content: string): Promise<boolean>;
export {};
