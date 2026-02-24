const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function asyncHandler(handler) {
    return (req, res, next) => {
        void handler(req, res, next).catch((error) => {
            console.error('Route failed.', error);
            if (res.headersSent) {
                next(error);
                return;
            }
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            });
        });
    };
}
export function success(res, data, status = 200) {
    res.status(status).json({ data });
}
export function validationError(res, message) {
    res.status(400).json({
        error: {
            code: 'VALIDATION_ERROR',
            message,
        },
    });
}
export function notFound(res, message) {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message,
        },
    });
}
export function internalError(res, message = 'Internal server error') {
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message,
        },
    });
}
export function asRecord(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value;
    }
    return {};
}
export function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
export function getTrimmedString(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
export function getQueryString(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
export function getNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}
export function getInteger(value) {
    const parsed = getNumber(value);
    return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}
export function getBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return null;
}
export function isUuid(value) {
    return UUID_REGEX.test(value);
}
export function isDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = Date.parse(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed);
}
export function isIsoDateTime(value) {
    return !Number.isNaN(Date.parse(value));
}
//# sourceMappingURL=utils.js.map