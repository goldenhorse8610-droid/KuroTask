import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

// GET /idle-monitor/status - 放置タスクの取得
router.get('/status', async (req: any, res: Response) => {
    try {
        const settings = await prisma.settings.findUnique({
            where: { userId: req.user.id }
        });

        const thresholdDays = settings?.idleThresholdDays || 7;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

        // 各タスクの最新セッションの終了時刻を確認
        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
                isArchived: false,
                idleMonitorEnabled: true
            },
            include: {
                timerSessions: {
                    orderBy: { endAt: 'desc' },
                    take: 1,
                    where: { endAt: { not: null } }
                }
            }
        });

        const idleTasks = tasks.filter(task => {
            const lastSession = task.timerSessions[0];
            if (!lastSession) {
                // セッションがない場合は作成日と比較
                return new Date(task.createdAt) < thresholdDate;
            }
            return new Date(lastSession.endAt!) < thresholdDate;
        });

        res.json({
            idleTasks: idleTasks.map(t => ({
                id: t.id,
                name: t.name,
                lastActive: t.timerSessions[0]?.endAt || t.createdAt
            })),
            thresholdDays
        });
    } catch (error) {
        console.error('Idle monitor error:', error);
        res.status(500).json({ error: 'Failed to fetch idle tasks' });
    }
});

export default router;
