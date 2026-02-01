import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { withRetry } from '../utils/retry';

export interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as any;

        // Attempt to find user with retry logic to handle temporary DB issues.
        try {
            const user = await withRetry(() => prisma.user.findUnique({ where: { id: decoded.userId } }));
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            req.user = user;
            next();
        } catch (dbError: any) {
            console.error('[AuthMiddleware] Database Error:', dbError.message);
            return res.status(503).json({
                error: 'Database connection failed',
                details: 'The server is currently unable to reach the database.'
            });
        }
    } catch (jwtError: any) {
        console.error('[AuthMiddleware] JWT Verification Error:', jwtError.message);
        return res.status(401).json({
            error: 'Invalid token',
            details: jwtError.message === 'jwt expired' ? 'Your session has expired. Please login again.' : 'Authentication failed.'
        });
    }
};
