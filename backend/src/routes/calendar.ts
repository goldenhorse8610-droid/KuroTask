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

// GET /calendar/events?month=YYYY-MM
router.get('/events', async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { month } = req.query; // e.g., "2026-01"

        if (!month) return res.status(400).json({ error: 'Month parameter is required' });

        const [year, mon] = (month as string).split('-').map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

        // その月のセッション実績を取得
        const sessions = await prisma.timerSession.findMany({
            where: {
                userId,
                startAt: { gte: startDate, lte: endDate },
                endAt: { not: null }
            },
            include: { task: true },
            orderBy: { startAt: 'asc' }
        });

        // その月の予定タスクを取得
        const plannedTasks = await prisma.task.findMany({
            where: {
                userId,
                plannedDate: { gte: startDate, lte: endDate },
                isArchived: false,
            }
        });

        // 日付ごとにグループ化
        const eventsByDate: Record<string, any[]> = {};

        sessions.forEach(s => {
            const dateStr = s.startAt.toISOString().split('T')[0];
            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            eventsByDate[dateStr].push({
                id: s.id,
                type: 'session',
                title: s.task.name,
                duration: s.durationSec,
                time: s.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });

        plannedTasks.forEach(t => {
            const dateStr = t.plannedDate!.toISOString().split('T')[0];
            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            // 同じタスクのセッションが既にある場合でも「予定」として表示するか、
            // それとも「予定」枠として別出しするか。
            // ユーザーは「予定タスクを確認できるように」と言っているので並べて出す。
            eventsByDate[dateStr].push({
                id: t.id,
                type: 'todo',
                title: t.name,
                category: t.category,
                memo: t.memo
            });
        });

        res.json({ events: eventsByDate });
    } catch (error) {
        console.error('Calendar events fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});

export default router;
