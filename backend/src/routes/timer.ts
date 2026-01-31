import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// GET /timer/current - 実行中セッション取得 (複数対応)
router.get('/current', async (req: any, res: Response) => {
    try {
        const sessions = await prisma.timerSession.findMany({
            where: {
                userId: req.user.id,
                endAt: null,
            },
            include: {
                task: true,
            },
            orderBy: {
                startAt: 'desc'
            }
        });

        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching current sessions:', error);
        res.status(500).json({ error: 'Failed to fetch current sessions' });
    }
});

// POST /timer/start - セッション開始 (複数タスク同時OK)
router.post('/start', async (req: any, res: Response) => {
    try {
        const { taskId, mode, plannedDurationSec, startMemo } = req.body;

        if (!taskId || !mode) {
            return res.status(400).json({ error: 'taskId and mode are required' });
        }

        if (!['stopwatch', 'countdown'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode' });
        }

        // タスク存在確認
        const task = await prisma.task.findFirst({
            where: { id: taskId, userId: req.user.id },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 同じタスクの実行中セッションチェック
        const existingSession = await prisma.timerSession.findFirst({
            where: {
                userId: req.user.id,
                taskId: taskId,
                endAt: null,
            },
        });

        if (existingSession) {
            return res.status(400).json({
                error: 'Task already running',
                existingSession
            });
        }

        // 新規セッション作成
        const session = await prisma.timerSession.create({
            data: {
                userId: req.user.id,
                taskId,
                mode,
                plannedDurationSec: plannedDurationSec || null,
                startAt: new Date(),
                startMemo: startMemo || null,
            },
            include: {
                task: true,
            },
        });

        res.json({ session });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /timer/stop - セッション終了 (指定IDまたは単体停止)
router.post('/stop', async (req: any, res: Response) => {
    try {
        const { sessionId, endMemo } = req.body;

        // 指定がない場合は、最後に開始されたものを1つ探す（後方互換性のため）
        let session;
        if (sessionId) {
            session = await prisma.timerSession.findFirst({
                where: {
                    id: sessionId,
                    userId: req.user.id,
                    endAt: null,
                },
            });
        } else {
            session = await prisma.timerSession.findFirst({
                where: {
                    userId: req.user.id,
                    endAt: null,
                },
                orderBy: {
                    startAt: 'desc'
                }
            });
        }

        if (!session) {
            return res.status(404).json({ error: 'No active session found' });
        }

        const now = new Date();
        const durationSec = Math.floor((now.getTime() - new Date(session.startAt).getTime()) / 1000);

        // セッション更新
        const updatedSession = await prisma.timerSession.update({
            where: { id: session.id },
            data: {
                endAt: now,
                endMemo: endMemo || null,
                durationSec,
                endReason: 'manual_stop',
            },
            include: {
                task: true,
            },
        });

        res.json({ session: updatedSession });
    } catch (error) {
        console.error('Error stopping session:', error);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

// PATCH /timer/sessions/:id - セッション編集
router.patch('/sessions/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { startAt, endAt, startMemo, endMemo } = req.body;

        const session = await prisma.timerSession.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // durationSecを再計算
        let durationSec = session.durationSec;
        if (startAt || endAt) {
            const start = startAt ? new Date(startAt) : new Date(session.startAt);
            const end = endAt ? new Date(endAt) : (session.endAt ? new Date(session.endAt) : new Date());
            durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
        }

        const updatedSession = await prisma.timerSession.update({
            where: { id },
            data: {
                startAt: startAt ? new Date(startAt) : session.startAt,
                endAt: endAt ? new Date(endAt) : session.endAt,
                startMemo: startMemo !== undefined ? startMemo : session.startMemo,
                endMemo: endMemo !== undefined ? endMemo : session.endMemo,
                durationSec,
                endReason: session.endReason || 'edited',
            },
            include: {
                task: true,
            },
        });

        res.json({ session: updatedSession });
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// GET /timer/history - 過去のセッション一覧取得 (ページネーション)
router.get('/history', async (req: any, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const sessions = await prisma.timerSession.findMany({
            where: {
                userId: req.user.id,
                endAt: { not: null },
            },
            include: {
                task: true,
            },
            orderBy: {
                startAt: 'desc',
            },
            skip,
            take: limit,
        });

        const total = await prisma.timerSession.count({
            where: {
                userId: req.user.id,
                endAt: { not: null },
            },
        });

        res.json({ sessions, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Error fetching timer history:', error);
        res.status(500).json({ error: 'Failed to fetch timer history' });
    }
});

// DELETE /timer/sessions/:id - セッション削除
router.delete('/sessions/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.timerSession.deleteMany({
            where: { id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// GET /timer/sessions - 全セッション取得 (同期用)
router.get('/sessions', async (req: any, res: Response) => {
    try {
        const sessions = await prisma.timerSession.findMany({
            where: { userId: req.user.id },
            orderBy: { startAt: 'desc' }
        });
        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching all sessions:', error);
        res.status(500).json({ error: 'Failed to fetch all sessions' });
    }
});

export default router;
