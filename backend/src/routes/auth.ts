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

    // Create user if not exists (Lazy registration as per spec "First setup creates user")
    // Actually spec says "Single user operation". We can just allow any email for now or lock it.
    // For MVP v1.2, we will create if not exists.

    // Generate code
    // For Production (without email service), we hardcode a backdoor for the owner.
    // In real app, this should be an environment variable or actual email sending.
    let code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // BACKDOOR for easiest login
    // Allow any email containing '8610' or 'admin', or the specific emails
    if (email.includes('8610') || email.includes('admin') || email === 'goldenhorse8610@gmail.com') {
        code = '000000';
    }

    const token = Math.random().toString(36).substring(2, 15); // URL token

    pendingAuth[token] = {
        email,
        code,
        expires: Date.now() + 10 * 60 * 1000 // 10 min
    };

    // Mock Email Sending
    console.log(`[AUTH] Login Link: http://localhost:5173/login?token=${token}`);
    console.log(`[AUTH] Login Code: ${code}`);

    res.json({ message: "Magic link sent (check console)" });
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
