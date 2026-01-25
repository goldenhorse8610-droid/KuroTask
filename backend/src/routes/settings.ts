import { Router, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware to extract user from JWT
const authMiddleware = async (req: any, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.use(authMiddleware);

// GET /settings - 設定取得
router.get('/', async (req: any, res: Response) => {
    try {
        let settings = await prisma.settings.findUnique({
            where: { userId: req.user.id }
        });

        if (!settings) {
            settings = await prisma.settings.create({
                data: { userId: req.user.id }
            });
        }

        res.json({ settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PATCH /settings - 設定更新
router.patch('/', async (req: any, res: Response) => {
    try {
        const {
            wakeWarningTime,
            timerElapsedRemindMin,
            timerElapsedRemindRepeat,
            silentHoursStart,
            silentHoursEnd
        } = req.body;

        const settings = await prisma.settings.upsert({
            where: { userId: req.user.id },
            update: {
                wakeWarningTime,
                timerElapsedRemindMin,
                timerElapsedRemindRepeat,
                silentHoursStart,
                silentHoursEnd
            },
            create: {
                userId: req.user.id,
                wakeWarningTime,
                timerElapsedRemindMin,
                timerElapsedRemindRepeat,
                silentHoursStart,
                silentHoursEnd
            }
        });

        res.json({ settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
