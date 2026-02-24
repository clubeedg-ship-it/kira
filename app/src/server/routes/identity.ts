import { Router } from 'express';
import { db } from '../../db';
import { userIdentity, identityChangelog } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { DEFAULT_SOUL, DEFAULT_INSTRUCTIONS, DEFAULT_PROFILE, DEFAULT_TOOLS, DEFAULT_MEMORY } from '../agent/default-templates';

const router = Router();

const DEFAULTS: Record<string, string> = {
  soul: DEFAULT_SOUL,
  profile: DEFAULT_PROFILE,
  instructions: DEFAULT_INSTRUCTIONS,
  tools: DEFAULT_TOOLS,
  memory: DEFAULT_MEMORY,
};

const VALID_KEYS = ['soul', 'profile', 'instructions', 'tools', 'memory'];

// GET /api/v1/identity — list all identity files
router.get('/', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const files = await db.select().from(userIdentity)
      .where(eq(userIdentity.userId, userId));

    const result: Record<string, any> = {};
    for (const key of VALID_KEYS) {
      const found = files.find(f => f.fileKey === key);
      result[key] = {
        content: found?.content || DEFAULTS[key],
        version: found?.version || 0,
        updatedAt: found?.updatedAt || null,
        updatedBy: found?.updatedBy || 'system',
        isDefault: !found,
      };
    }

    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/v1/identity/changelog — get evolution history
// NOTE: must be before /:fileKey to avoid matching 'changelog' as fileKey
router.get('/changelog', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const logs = await db.select().from(identityChangelog)
      .where(eq(identityChangelog.userId, userId))
      .orderBy(desc(identityChangelog.createdAt))
      .limit(50);

    res.json({ data: logs });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// PUT /api/v1/identity/:fileKey — update an identity file
router.put('/:fileKey', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { fileKey } = req.params;
  const { content } = req.body;

  if (!VALID_KEYS.includes(fileKey)) {
    return res.status(400).json({ error: 'Invalid file key' });
  }

  try {
    const { updateIdentityFile } = await import('../agent/evolution');
    const result = await updateIdentityFile(userId, fileKey, content, 'User edit', 'user');
    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/v1/identity/reset/:fileKey — reset to default
router.post('/reset/:fileKey', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { fileKey } = req.params;
  if (!DEFAULTS[fileKey]) return res.status(400).json({ error: 'Invalid file key' });

  try {
    const { updateIdentityFile } = await import('../agent/evolution');
    const result = await updateIdentityFile(userId, fileKey, DEFAULTS[fileKey], 'Reset to default', 'user');
    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export { router as identityRouter };
export default router;
