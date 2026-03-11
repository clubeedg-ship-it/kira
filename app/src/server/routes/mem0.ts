/**
 * Mem0 Memory API routes — expose memory operations to the dashboard.
 */
import { Router } from 'express';
import {
  searchMemory,
  getAllMemories,
  getMemoryById,
  deleteMemory,
  getMemoryHistory,
  addToMemory,
} from '../memory/mem0-service';

export const mem0Router = Router();

/**
 * GET /api/v1/mem0/memories — List all memories for the user
 */
mem0Router.get('/memories', async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const agentId = (req.query.agentId as string) || 'kira';
    const memories = await getAllMemories(userId, agentId);
    res.json({ ok: true, memories });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/v1/mem0/memories/:id — Get a specific memory
 */
mem0Router.get('/memories/:id', async (req, res) => {
  try {
    const memory = await getMemoryById(req.params.id);
    if (!memory) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, memory });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/v1/mem0/memories/:id/history — Get memory change history
 */
mem0Router.get('/memories/:id/history', async (req, res) => {
  try {
    const history = await getMemoryHistory(req.params.id);
    res.json({ ok: true, history });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/v1/mem0/search — Search memories by query
 */
mem0Router.post('/search', async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { query, agentId, limit } = req.body;
    if (!query) return res.status(400).json({ ok: false, error: 'query required' });

    const results = await searchMemory(query, {
      userId,
      agentId: agentId || 'kira',
      limit: limit || 10,
    });
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/v1/mem0/add — Manually add a memory
 */
mem0Router.post('/add', async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { content, agentId } = req.body;
    if (!content) return res.status(400).json({ ok: false, error: 'content required' });

    const result = await addToMemory(
      [{ role: 'user', content }],
      { userId, agentId: agentId || 'kira' },
    );
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * DELETE /api/v1/mem0/memories/:id — Delete a memory
 */
mem0Router.delete('/memories/:id', async (req, res) => {
  try {
    const ok = await deleteMemory(req.params.id);
    res.json({ ok });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
