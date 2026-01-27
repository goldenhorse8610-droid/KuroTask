import { Router, Request, Response, RequestHandler } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const router = Router();

// Mock in-memory store for verification codes/tokens
// In production, use Redis or DB. For single user MVP, this is fine.
const pendingAuth: Record<string, { email: string, code: string, expires: number }> = {};

// POST /auth/request-link
const requestLinkHandler: RequestHandler = async (req, res): Promise<void> => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Email required" });
        return;
    }

    try {
        // Create user if not exists
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email }
            });
        }

        // Generate JWT token immediately
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const jwtToken = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '30d' });

        console.log(`[AUTH] Direct login for: ${email}`);

        // Return token directly - no verification needed
        res.json({ token: jwtToken, message: "Login successful" });
    } catch (error) {
        console.error('[AUTH] Error during login:', error);
        res.status(500).json({ error: "Login failed" });
    }
};

// POST /auth/verify
const verifyHandler: RequestHandler = async (req, res): Promise<void> => {
    const { token, code } = req.body;

    let authData;
    if (token && pendingAuth[token]) {
        authData = pendingAuth[token];
        if (Date.now() > authData.expires) {
            delete pendingAuth[token];
            res.status(401).json({ error: "Expired" });
            return;
        }
        delete pendingAuth[token]; // Consume
    } else if (code) {
        // Find by code (inefficient but OK for single user)
        const foundToken = Object.keys(pendingAuth).find(k => pendingAuth[k].code === code);
        if (foundToken) {
            authData = pendingAuth[foundToken];
            delete pendingAuth[foundToken];
        }
    }

    if (!authData) {
        res.status(401).json({ error: "Invalid token/code" });
        return;
    }

    // Find or Create User
    let user = await prisma.user.findUnique({ where: { email: authData.email } });
    if (!user) {
        user = await prisma.user.create({ data: { email: authData.email } });
    }

    // Generate Session JWT
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const sessionToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '30d' }); // Long lived

    res.json({ token: sessionToken, user });
};

// POST /auth/me (Verify session)
const meHandler: RequestHandler = async (req, res): Promise<void> => {
    // Middleware should handle this usually, but simple check here
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).send(); return; }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) { res.status(401).send(); return; }
        res.json({ user });
    } catch (e) {
        res.status(401).send();
    }
}

router.post('/request-link', requestLinkHandler);
router.post('/verify', verifyHandler);
router.get('/me', meHandler);

export default router;
