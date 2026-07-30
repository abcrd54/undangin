import jwt from 'jsonwebtoken';
import { env } from '../database.js';

export function authJWT(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: ['Unauthorized'] });
    }

    const token = header.slice(7);

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: ['Invalid or expired token'] });
    }
}

export function authAccessKey(req, res, next) {
    const key = req.headers['x-access-key'];

    if (!key) {
        return res.status(401).json({ error: ['Access key required'] });
    }

    req.accessKey = key;
    next();
}

export function authComment(req, res, next) {
    const authHeader = req.headers.authorization;
    const accessKey = req.headers['x-access-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch {
            // fall through to access key
        }
    }

    if (accessKey) {
        req.accessKey = accessKey;
        return next();
    }

    return res.status(401).json({ error: ['Unauthorized'] });
}