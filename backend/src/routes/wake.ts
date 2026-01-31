import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// POST /wake - 起床記録
router.post('/', async (req: any, res: Response) => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();

        // 既に今日の記録があるかチェック
        const existing = await prisma.wakeLog.findFirst({
            where: {
                userId: req.user.id,
                date: dateStr,
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'Already recorded today' });
        }

        // 10時以降かチェック（警告）
        const warned = hour >= 10;

        const wakeLog = await prisma.wakeLog.create({
            data: {
                userId: req.user.id,
                date: dateStr,
                wakeAt: now,
                warned,
                isRestDay: false, // TODO: Settings から判定
            },
        });

        res.json({ wakeLog });
    } catch (error) {
        console.error('Error creating wake log:', error);
        res.status(500).json({ error: 'Failed to create wake log' });
    }
});

// GET /wake - 起床履歴取得
router.get('/', async (req: any, res: Response) => {
    try {
        const logs = await prisma.wakeLog.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'desc' },
            take: 30, // 最新30件
        });

        res.json({ logs });
    } catch (error) {
        console.error('Error fetching wake logs:', error);
        res.status(500).json({ error: 'Failed to fetch wake logs' });
    }
});

// GET /wake/today - 今日の起床記録取得
router.get('/today', async (req: any, res: Response) => {
    try {
        const dateStr = new Date().toISOString().split('T')[0];

        const log = await prisma.wakeLog.findFirst({
            where: {
                userId: req.user.id,
                date: dateStr,
            },
        });

        res.json({ log });
    } catch (error) {
        console.error('Error fetching today wake log:', error);
        res.status(500).json({ error: 'Failed to fetch today wake log' });
    }
});

// DELETE /wake/today - 今日の起床記録を削除
router.delete('/today', async (req: any, res: Response) => {
    try {
        const dateStr = new Date().toISOString().split('T')[0];

        // 削除対象を確認
        const log = await prisma.wakeLog.findFirst({
            where: {
                userId: req.user.id,
                date: dateStr,
            },
        });

        if (!log) {
            return res.status(404).json({ error: 'No wake log found for today' });
        }

        await prisma.wakeLog.delete({
            where: { id: log.id },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting today wake log:', error);
        res.status(500).json({ error: 'Failed to delete today wake log' });
    }
});

export default router;
