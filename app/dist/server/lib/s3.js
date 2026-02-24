import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client, } from '@aws-sdk/client-s3';
const S3_ENDPOINT = process.env.S3_ENDPOINT?.trim() || undefined;
const S3_REGION = process.env.S3_REGION?.trim() || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET?.trim() || 'kira-files';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY?.trim();
const S3_SECRET_KEY = process.env.S3_SECRET_KEY?.trim();
const LOCAL_FALLBACK_DIR = process.env.LOCAL_S3_FALLBACK_DIR?.trim() || '.local-s3';
const credentials = S3_ACCESS_KEY && S3_SECRET_KEY
    ? {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    }
    : undefined;
export const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: Boolean(S3_ENDPOINT),
    credentials,
});
let bucketInitPromise = null;
let usingLocalFallback = false;
// FIX-008: path traversal protection for S3 local fallback
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;
function validateStorageKey(key) {
    const segments = key.split('/').filter(Boolean);
    for (const segment of segments) {
        if (segment === '.' || segment === '..') {
            throw new Error(`Path traversal attempt blocked: ${key}`);
        }
        if (!SAFE_PATH_SEGMENT.test(segment)) {
            throw new Error(`Invalid path segment in storage key: "${segment}"`);
        }
    }
}
function safeLocalPath(baseDir, key) {
    validateStorageKey(key);
    const resolved = path.resolve(baseDir, ...key.split('/').filter(Boolean));
    const resolvedBase = path.resolve(baseDir);
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
        throw new Error(`Path traversal attempt blocked: resolved "${resolved}" is outside "${resolvedBase}"`);
    }
    return resolved;
}
function encodeS3Path(path) {
    return path
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
}
function getStatusCode(error) {
    if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
        return undefined;
    }
    return Number(error.$metadata?.httpStatusCode);
}
function shouldFallback(statusCode) {
    return (statusCode === 301 ||
        statusCode === 302 ||
        statusCode === 307 ||
        statusCode === 308 ||
        statusCode === 404 ||
        statusCode === 500 ||
        Number.isNaN(statusCode));
}
export async function ensureS3Bucket() {
    if (bucketInitPromise) {
        return bucketInitPromise;
    }
    bucketInitPromise = (async () => {
        if (usingLocalFallback) {
            return;
        }
        try {
            await s3Client.send(new HeadBucketCommand({
                Bucket: S3_BUCKET,
            }));
        }
        catch (error) {
            const statusCode = getStatusCode(error);
            if (statusCode === 403) {
                throw error;
            }
            try {
                await s3Client.send(new CreateBucketCommand({
                    Bucket: S3_BUCKET,
                }));
            }
            catch (createError) {
                const createStatusCode = getStatusCode(createError);
                if (process.env.NODE_ENV !== 'production' &&
                    (shouldFallback(statusCode) || shouldFallback(createStatusCode))) {
                    usingLocalFallback = true;
                    console.warn(`S3 unavailable in development mode; falling back to local storage at ${LOCAL_FALLBACK_DIR}.`);
                    return;
                }
                throw createError;
            }
        }
    })();
    return bucketInitPromise;
}
export async function uploadFile(key, body, contentType = 'text/markdown; charset=utf-8') {
    validateStorageKey(key);
    await ensureS3Bucket();
    if (usingLocalFallback) {
        const localPath = safeLocalPath(LOCAL_FALLBACK_DIR, key);
        await mkdir(path.dirname(localPath), { recursive: true });
        const fileBody = typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
        await writeFile(localPath, fileBody, 'utf8');
        return getFileUrl(key);
    }
    await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return getFileUrl(key);
}
export function getFileUrl(key) {
    validateStorageKey(key);
    const encodedKey = encodeS3Path(key);
    if (usingLocalFallback) {
        return `/local-s3/${encodedKey}`;
    }
    if (S3_ENDPOINT) {
        const endpoint = S3_ENDPOINT.replace(/\/+$/, '');
        return `${endpoint}/${S3_BUCKET}/${encodedKey}`;
    }
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodedKey}`;
}
export function getS3BucketName() {
    return S3_BUCKET;
}
//# sourceMappingURL=s3.js.map