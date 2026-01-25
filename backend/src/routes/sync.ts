import { Router, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware
const authMiddleware = async (req: any, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.use(authMiddleware);

/**
 * クラウドにデータを全送り (Push)
 * 同期バッファとしての役割。UPSERT を行う。
 */
router.post('/push', async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { tasks, sessions, wakeLogs, settings } = req.body;

        // トランザクションで一気に UPSERT。
        // ※ 本来は外部DBへの直接接続も可能だが、APIを介すことでセキュリティを担保。
        // ここでは受け取ったデータをDBに保存する処理を想定。

        await prisma.$transaction([
            // Tasks
            ...tasks.map((t: any) => prisma.task.upsert({
                where: { id: t.id },
                update: { ...t, userId },
                create: { ...t, userId }
            })),
            // Sessions
            ...sessions.map((s: any) => prisma.timerSession.upsert({
                where: { id: s.id },
                update: { ...s, userId },
                create: { ...s, userId }
            })),
            // WakeLogs
            ...wakeLogs.map((w: any) => prisma.wakeLog.upsert({
                where: { id: w.id },
                update: { ...w, userId },
                create: { ...w, userId }
            }))
        ]);

        res.json({ success: true, message: 'Sync pushed successfully' });
    } catch (error) {
        console.error('Sync push failed:', error);
        res.status(500).json({ error: 'Sync push failed' });
    }
});

/**
 * クラウドからデータを取得 (Pull)
 */
router.get('/pull', async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const tasks = await prisma.task.findMany({ where: { userId } });
        const sessions = await prisma.timerSession.findMany({ where: { userId } });
        const wakeLogs = await prisma.wakeLog.findMany({ where: { userId } });

        res.json({ tasks, sessions, wakeLogs });
    } catch (error) {
        console.error('Sync pull failed:', error);
        res.status(500).json({ error: 'Sync pull failed' });
    }
});

export default router;
