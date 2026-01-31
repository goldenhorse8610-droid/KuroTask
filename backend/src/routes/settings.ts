import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

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
