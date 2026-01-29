import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

// GET /calendar/feed/:token.ics
router.get('/feed/:token', async (req: Request, res: Response) => {
    try {
        // Disable temporarily as the DB column is missing
        return res.status(501).send('Calendar feed is temporarily disabled due to schema issues. Please contact administrator.');

        /*
        const tokenRaw = req.params.token as string;
        const token = tokenRaw.replace('.ics', '');
        
        const user = await prisma.user.findUnique({
            where: { calendarToken: token } as any,
            include: {
                tasks: {
                    where: {
                        plannedDate: { not: null },
                        isArchived: false,
                    }
                }
            } as any
        }) as any;

        if (!user) {
            return res.status(404).send('Invalid token');
        }
        ... rest of logic ...
        */
    } catch (error) {
        console.error('[CalendarFeed] Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
