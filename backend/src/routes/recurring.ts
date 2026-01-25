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

// GET /recurring - ルール一覧取得
router.get('/', async (req: any, res: Response) => {
    try {
        const rules = await prisma.recurringRule.findMany({
            where: { userId: req.user.id },
            include: { task: true }
        });
        res.json({ rules });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recurring rules' });
    }
});

// POST /recurring - ルール作成・更新
router.post('/', async (req: any, res: Response) => {
    try {
        const { taskId, ruleType, payload, reminderEnabled, reminderStartTime } = req.body;

        if (!taskId || !ruleType) {
            return res.status(400).json({ error: 'taskId and ruleType are required' });
        }

        const rule = await prisma.recurringRule.upsert({
            where: {
                // taskIdがユニークであると仮定するか、既存チェック
                id: (await prisma.recurringRule.findFirst({ where: { taskId, userId: req.user.id } }))?.id || 'new-id'
            },
            update: {
                ruleType,
                payload: payload ? JSON.stringify(payload) : null,
                reminderEnabled: reminderEnabled || false,
                reminderStartTime: reminderStartTime || null
            },
            create: {
                userId: req.user.id,
                taskId,
                ruleType,
                payload: payload ? JSON.stringify(payload) : null,
                reminderEnabled: reminderEnabled || false,
                reminderStartTime: reminderStartTime || null
            }
        });

        res.json({ rule });
    } catch (error) {
        console.error('Error saving recurring rule:', error);
        res.status(500).json({ error: 'Failed to save recurring rule' });
    }
});

// DELETE /recurring/:id - ルール削除
router.delete('/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.recurringRule.deleteMany({
            where: { id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete recurring rule' });
    }
});

export default router;
