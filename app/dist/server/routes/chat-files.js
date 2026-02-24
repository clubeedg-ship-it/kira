import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { success, validationError } from './utils';
const chatFilesRouter = Router();
const UPLOAD_BASE = '/tmp/kira-workspaces';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css', 'text/javascript',
    'application/json',
    'application/javascript',
    'text/x-python', 'text/x-java', 'text/x-c', 'text/x-typescript',
];
function isAllowedMime(mime) {
    if (ALLOWED_MIMES.includes(mime))
        return true;
    if (mime.startsWith('image/'))
        return true;
    if (mime.startsWith('text/'))
        return true;
    return false;
}
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const dir = path.join(UPLOAD_BASE, req.userId, 'uploads');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const id = crypto.randomUUID();
        cb(null, `${id}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (isAllowedMime(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    },
});
// Upload endpoint (requires auth)
chatFilesRouter.post('/upload', requireAuth, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        validationError(res, 'No file uploaded');
        return;
    }
    const id = path.basename(file.filename, path.extname(file.filename));
    const result = {
        id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/api/v1/chat/files/${req.userId}/${file.filename}`,
    };
    success(res, result, 201);
});
// Serve files (no auth needed for serving - allows embedding in messages)
chatFilesRouter.get('/files/:userId/:filename', (req, res) => {
    const { userId, filename } = req.params;
    // Sanitize to prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_BASE, userId, 'uploads', safeName);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    res.sendFile(filePath);
});
export { chatFilesRouter };
//# sourceMappingURL=chat-files.js.map