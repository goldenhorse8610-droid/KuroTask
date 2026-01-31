import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// GET /tasks - タスク一覧（アーカイブ除外）
router.get('/', async (req: any, res: Response) => {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
                isArchived: false,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// POST /tasks - タスク作成
router.post('/', async (req: any, res: Response) => {
    try {
        const {
            name,
            type,
            category,
            memo,
            isFavorite,
            idleMonitorEnabled,
            defaultTimerDurationSec,
            plannedDate,
            plannedStartAt,
            plannedEndAt,
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        if (!['stopwatch', 'timer', 'checklist'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }

        const task = await prisma.task.create({
            data: {
                userId: req.user.id,
                name,
                type,
                category: category || null,
                memo: memo || null,
                isFavorite: isFavorite || false,
                idleMonitorEnabled: idleMonitorEnabled || false,
                defaultTimerDurationSec: defaultTimerDurationSec || null,
                plannedDate: plannedDate ? new Date(plannedDate) : null,
                plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : null,
                plannedEndAt: plannedEndAt ? new Date(plannedEndAt) : null,
            } as any,
        });

        res.json({ task });
    } catch (error: any) {
        console.error('[Tasks] Error creating task:', error);
        console.error('[Tasks] Payload:', req.body);
        res.status(500).json({
            error: 'Failed to create task',
            details: error.message
        });
    }
});

// PATCH /tasks/:id - タスク更新
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            memo,
            isFavorite,
            idleMonitorEnabled,
            defaultTimerDurationSec,
            plannedDate,
            plannedStartAt,
            plannedEndAt,
        } = req.body;

        const task = await prisma.task.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                name: name !== undefined ? name : task.name,
                category: category !== undefined ? category : task.category,
                memo: memo !== undefined ? memo : task.memo,
                isFavorite: isFavorite !== undefined ? isFavorite : task.isFavorite,
                idleMonitorEnabled: idleMonitorEnabled !== undefined ? idleMonitorEnabled : task.idleMonitorEnabled,
                defaultTimerDurationSec: defaultTimerDurationSec !== undefined ? defaultTimerDurationSec : task.defaultTimerDurationSec,
                plannedDate: plannedDate !== undefined ? (plannedDate ? new Date(plannedDate) : null) : task.plannedDate,
                plannedStartAt: plannedStartAt !== undefined ? (plannedStartAt ? new Date(plannedStartAt) : null) : (task as any).plannedStartAt,
                plannedEndAt: plannedEndAt !== undefined ? (plannedEndAt ? new Date(plannedEndAt) : null) : (task as any).plannedEndAt,
            } as any,
        });

        res.json({ task: updatedTask });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// POST /tasks/:id/toggle-favorite - お気に入りトグル
router.post('/:id/toggle-favorite', async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { isFavorite: !task.isFavorite },
        });

        res.json({ task: updatedTask });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// POST /tasks/:id/archive - タスクアーカイブ
router.post('/:id/archive', async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const archivedTask = await prisma.task.update({
            where: { id },
            data: { isArchived: true },
        });

        res.json({ task: archivedTask });
    } catch (error) {
        console.error('Error archiving task:', error);
        res.status(500).json({ error: 'Failed to archive task' });
    }
});

export default router;
