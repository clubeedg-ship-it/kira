import { Router } from 'express';
import { ensureContainer, execInContainer, readContainerFile, writeContainerFile, listContainerDir, startServer, pauseContainer, destroyContainer, } from '../container-manager';
export const sandboxRouter = Router();
// POST /exec — Execute command in user's container
sandboxRouter.post('/exec', async (req, res) => {
    try {
        const userId = req.userId;
        const { command, timeout } = req.body;
        if (!command)
            return res.status(400).json({ error: 'command is required' });
        const result = await execInContainer(userId, command, timeout ? timeout * 1000 : undefined);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /status — Container status
sandboxRouter.get('/status', async (req, res) => {
    try {
        const userId = req.userId;
        const info = await ensureContainer(userId);
        res.json(info);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /files — List directory
sandboxRouter.get('/files', async (req, res) => {
    try {
        const userId = req.userId;
        const dir = req.query.path || '';
        const files = await listContainerDir(userId, dir);
        res.json({ files });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /files/read — Read file
sandboxRouter.get('/files/read', async (req, res) => {
    try {
        const userId = req.userId;
        const filePath = req.query.path;
        if (!filePath)
            return res.status(400).json({ error: 'path is required' });
        const content = await readContainerFile(userId, filePath);
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /files/write — Write file
sandboxRouter.post('/files/write', async (req, res) => {
    try {
        const userId = req.userId;
        const { path, content } = req.body;
        if (!path || content === undefined)
            return res.status(400).json({ error: 'path and content are required' });
        await writeContainerFile(userId, path, content);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /start-server — Start a server process
sandboxRouter.post('/start-server', async (req, res) => {
    try {
        const userId = req.userId;
        const { command, port } = req.body;
        if (!command || !port)
            return res.status(400).json({ error: 'command and port are required' });
        const url = await startServer(userId, command, port);
        res.json({ url });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /pause — Pause container
sandboxRouter.post('/pause', async (req, res) => {
    try {
        const userId = req.userId;
        await pauseContainer(userId);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /destroy — Destroy container
sandboxRouter.post('/destroy', async (req, res) => {
    try {
        const userId = req.userId;
        await destroyContainer(userId);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=sandbox.js.map