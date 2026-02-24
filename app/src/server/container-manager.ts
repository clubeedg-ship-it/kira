/**
 * Persistent Container Manager — manages per-user Docker containers
 * for the code execution sandbox.
 */

import { execSync, spawn } from 'child_process';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userContainers } from '../db/schema';

const SANDBOX_IMAGE = 'kira-sandbox:latest';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 50_000;

export interface ContainerInfo {
  containerId: string;
  status: 'creating' | 'running' | 'paused' | 'stopped';
  ports: Record<string, string>;
}

function containerName(userId: string): string {
  return `kira-sandbox-${userId.slice(0, 8)}`;
}

function sanitizePath(p: string): string {
  // Remove any path traversal and ensure it's relative to /home/user
  const cleaned = p.replace(/\.\./g, '').replace(/^\/+/, '');
  // Strip leading /home/user/ if provided
  const stripped = cleaned.replace(/^home\/user\/?/, '');
  return stripped;
}

function ensureImageBuilt(): void {
  try {
    execSync('docker image inspect kira-sandbox:latest', { stdio: 'pipe' });
  } catch {
    console.log('[container-manager] Building kira-sandbox:latest image...');
    execSync('docker build -t kira-sandbox:latest -f Dockerfile.sandbox .', {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300_000, // 5 min max for build
    });
  }
}

function getDockerStatus(name: string): string | null {
  try {
    const result = execSync(
      `docker inspect --format '{{.State.Status}}' ${name}`,
      { stdio: 'pipe', encoding: 'utf8' },
    ).trim();
    return result;
  } catch {
    return null;
  }
}

export async function ensureContainer(userId: string): Promise<ContainerInfo> {
  const name = containerName(userId);

  // Check DB first
  const [existing] = await db.select().from(userContainers).where(eq(userContainers.userId, userId)).limit(1);

  // Check actual Docker status
  const dockerStatus = getDockerStatus(name);

  if (dockerStatus === 'running') {
    // Update DB if needed
    if (!existing) {
      const containerId = execSync(`docker inspect --format '{{.Id}}' ${name}`, { encoding: 'utf8', stdio: 'pipe' }).trim().slice(0, 12);
      await db.insert(userContainers).values({
        userId,
        containerId,
        status: 'running',
      }).onConflictDoUpdate({
        target: userContainers.userId,
        set: { status: 'running', containerId, lastActiveAt: new Date().toISOString() },
      });
    } else if (existing.status !== 'running') {
      await db.update(userContainers).set({ status: 'running', lastActiveAt: new Date().toISOString() }).where(eq(userContainers.userId, userId));
    }
    return {
      containerId: existing?.containerId || name,
      status: 'running',
      ports: (existing?.ports as Record<string, string>) || {},
    };
  }

  if (dockerStatus === 'paused') {
    execSync(`docker unpause ${name}`, { stdio: 'pipe' });
    await db.update(userContainers).set({ status: 'running', lastActiveAt: new Date().toISOString() }).where(eq(userContainers.userId, userId));
    return {
      containerId: existing?.containerId || name,
      status: 'running',
      ports: (existing?.ports as Record<string, string>) || {},
    };
  }

  if (dockerStatus === 'exited' || dockerStatus === 'created') {
    execSync(`docker start ${name}`, { stdio: 'pipe' });
    await db.update(userContainers).set({ status: 'running', lastActiveAt: new Date().toISOString() }).where(eq(userContainers.userId, userId));
    return {
      containerId: existing?.containerId || name,
      status: 'running',
      ports: (existing?.ports as Record<string, string>) || {},
    };
  }

  // Container doesn't exist — create it
  ensureImageBuilt();

  // Remove leftover if any
  try { execSync(`docker rm -f ${name}`, { stdio: 'pipe' }); } catch {}

  execSync(
    `docker create --name ${name} ` +
    `--memory 512m --cpus 1 --pids-limit 128 ` +
    `--network bridge ` +
    `-v ${name}-home:/home/user ` +
    `${SANDBOX_IMAGE} sleep infinity`,
    { stdio: 'pipe' },
  );

  execSync(`docker start ${name}`, { stdio: 'pipe' });

  const containerId = execSync(`docker inspect --format '{{.Id}}' ${name}`, { encoding: 'utf8', stdio: 'pipe' }).trim().slice(0, 12);

  await db.insert(userContainers).values({
    userId,
    containerId,
    status: 'running',
  }).onConflictDoUpdate({
    target: userContainers.userId,
    set: { status: 'running', containerId, lastActiveAt: new Date().toISOString() },
  });

  return { containerId, status: 'running', ports: {} };
}

export async function execInContainer(
  userId: string,
  command: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  await ensureContainer(userId);
  const name = containerName(userId);
  const start = Date.now();

  // Update lastActiveAt
  await db.update(userContainers)
    .set({ lastActiveAt: new Date().toISOString() })
    .where(eq(userContainers.userId, userId));

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    const proc = spawn('docker', ['exec', name, 'sh', '-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT) {
        stdout = stdout.slice(0, MAX_OUTPUT) + '\n... [truncated]';
        proc.kill('SIGKILL');
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      if (stderr.length > MAX_OUTPUT) {
        stderr = stderr.slice(0, MAX_OUTPUT) + '\n... [truncated]';
      }
    });

    const timer = setTimeout(() => {
      if (!finished) {
        proc.kill('SIGKILL');
        finished = true;
        resolve({
          stdout: stdout.trim(),
          stderr: (stderr + '\n[timed out]').trim(),
          exitCode: 124,
          durationMs: Date.now() - start,
        });
      }
    }, timeout);

    proc.on('close', (exitCode) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? 1,
        durationMs: Date.now() - start,
      });
    });

    proc.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: `Container exec error: ${err.message}`,
        exitCode: 1,
        durationMs: Date.now() - start,
      });
    });
  });
}

export async function readContainerFile(userId: string, filePath: string): Promise<string> {
  const safe = sanitizePath(filePath);
  const result = await execInContainer(userId, `cat /home/user/${safe}`, 10_000);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read file: ${result.stderr}`);
  }
  return result.stdout;
}

export async function writeContainerFile(userId: string, filePath: string, content: string): Promise<void> {
  await ensureContainer(userId);
  const name = containerName(userId);
  const safe = sanitizePath(filePath);

  // Ensure parent directory exists
  const dir = safe.includes('/') ? safe.substring(0, safe.lastIndexOf('/')) : '';
  if (dir) {
    execSync(`docker exec ${name} mkdir -p /home/user/${dir}`, { stdio: 'pipe' });
  }

  // Write using stdin pipe
  const proc = spawn('docker', ['exec', '-i', name, 'tee', `/home/user/${safe}`], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to write file, exit code ${code}`));
    });
    proc.on('error', reject);
    proc.stdin.write(content);
    proc.stdin.end();
  });
}

export async function listContainerDir(userId: string, dir?: string): Promise<string[]> {
  const safe = dir ? sanitizePath(dir) : '';
  const target = safe ? `/home/user/${safe}` : '/home/user';
  const result = await execInContainer(userId, `ls -la ${target}`, 10_000);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list directory: ${result.stderr}`);
  }
  return result.stdout.split('\n').filter(Boolean);
}

export async function startServer(
  userId: string,
  command: string,
  port: number,
): Promise<string> {
  await ensureContainer(userId);
  const name = containerName(userId);

  // Start the server in the background inside the container
  execSync(`docker exec -d ${name} sh -c '${command.replace(/'/g, "'\\''")}'`, { stdio: 'pipe' });

  // Update ports in DB
  const [existing] = await db.select().from(userContainers).where(eq(userContainers.userId, userId)).limit(1);
  const ports = { ...((existing?.ports as Record<string, string>) || {}), [String(port)]: 'active' };
  await db.update(userContainers).set({ ports }).where(eq(userContainers.userId, userId));

  // MVP: no actual port proxy, just return info
  return `Server started on port ${port} inside container ${name}. Use sandbox exec to curl localhost:${port}`;
}

export async function pauseContainer(userId: string): Promise<void> {
  const name = containerName(userId);
  const status = getDockerStatus(name);
  if (status === 'running') {
    execSync(`docker pause ${name}`, { stdio: 'pipe' });
    await db.update(userContainers).set({ status: 'paused' }).where(eq(userContainers.userId, userId));
  }
}

export async function destroyContainer(userId: string): Promise<void> {
  const name = containerName(userId);
  try {
    execSync(`docker rm -f ${name}`, { stdio: 'pipe' });
  } catch {}
  try {
    execSync(`docker volume rm ${name}-home`, { stdio: 'pipe' });
  } catch {}
  await db.delete(userContainers).where(eq(userContainers.userId, userId));
}
