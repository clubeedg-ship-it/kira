const unauthorizedResponse = {
    error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
    },
};
function shouldSkipAuth(req) {
    if (req.method === 'GET' && req.path === '/api/health') {
        return true;
    }
    if (req.originalUrl.startsWith('/api/v1/auth/')) {
        return true;
    }
    return req.originalUrl === '/api/v1/auth';
}
export async function requireAuth(req, res, next) {
    // Single-tenant mode: always inject default user
    if (process.env.SINGLE_TENANT === 'true') {
        req.userId = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';
        return next();
    }
    if (shouldSkipAuth(req)) {
        next();
        return;
    }
    try {
        const { fromNodeHeaders } = await import('better-auth/node');
        const { auth } = await import('../auth');
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (!session?.user?.id) {
            res.status(401).json(unauthorizedResponse);
            return;
        }
        req.userId = session.user.id;
        next();
    }
    catch {
        res.status(401).json(unauthorizedResponse);
    }
}
//# sourceMappingURL=auth.js.map