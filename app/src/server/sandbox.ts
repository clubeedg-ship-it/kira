/**
 * Code Execution Sandbox — backed by persistent per-user Docker containers
 *
 * This module preserves the original interface (executeCode, listWorkspaceFiles,
 * readWorkspaceFile, writeWorkspaceFile) but delegates to the container manager
 * for persistent sandboxes instead of disposable `docker run` invocations.
 */

import {
  ensureContainer,
  execInContainer,
  readContainerFile,
  writeContainerFile,
  listContainerDir,
} from './container-manager';

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

export async function executeCode(
  userId: string,
  code: string,
  language: 'bash' | 'python' | 'javascript' | 'node' = 'bash',
): Promise<ExecResult> {
  // Write code to a temp file and execute it
  const ext = language === 'python' ? '.py' : language === 'javascript' || language === 'node' ? '.js' : '.sh';
  const scriptName = `_exec_${Date.now()}${ext}`;

  await writeContainerFile(userId, scriptName, code);

  let cmd: string;
  switch (language) {
    case 'python':
      cmd = `python3 /home/user/${scriptName}`;
      break;
    case 'javascript':
    case 'node':
      cmd = `node /home/user/${scriptName}`;
      break;
    case 'bash':
    default:
      cmd = `bash /home/user/${scriptName}`;
      break;
  }

  const result = await execInContainer(userId, cmd, 30_000);

  // Clean up temp script (best effort)
  try { await execInContainer(userId, `rm -f /home/user/${scriptName}`, 5_000); } catch {}

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.exitCode === 124,
    durationMs: result.durationMs,
  };
}

/**
 * List files in user's persistent container workspace
 */
export async function listWorkspaceFiles(userId: string): Promise<string[]> {
  try {
    const lines = await listContainerDir(userId);
    return lines.filter(l => !l.startsWith('total') && !l.includes('_exec_'));
  } catch {
    return [];
  }
}

/**
 * Read file from user's persistent container workspace
 */
export async function readWorkspaceFile(userId: string, filename: string): Promise<string | null> {
  try {
    return await readContainerFile(userId, filename);
  } catch {
    return null;
  }
}

/**
 * Write file to user's persistent container workspace
 */
export async function writeWorkspaceFile(userId: string, filename: string, content: string): Promise<boolean> {
  try {
    await writeContainerFile(userId, filename, content);
    return true;
  } catch {
    return false;
  }
}
