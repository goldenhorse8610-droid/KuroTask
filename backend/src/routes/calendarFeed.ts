import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

// GET /calendar/feed/:token.ics
router.get('/feed/:token', async (req: Request, res: Response) => {
    try {
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

        // Generate ICS content
        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KuroTask//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:KuroTask',
            'X-WR-TIMEZONE:Asia/Tokyo'
        ];

        user.tasks.forEach((task: any) => {
            if (!task.plannedDate) return;

            const startDate = new Date(task.plannedDate);
            // End date is 30 mins after start date by default if no duration
            const endDate = new Date(startDate.getTime() + 30 * 60000);

            const formatICSDate = (date: Date) => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const createdDate = formatICSDate(task.createdAt);
            const startStr = formatICSDate(startDate);
            const endStr = formatICSDate(endDate);

            ics.push('BEGIN:VEVENT');
            ics.push(`UID:${task.id}@kurotask.com`);
            ics.push(`DTSTAMP:${createdDate}`);
            ics.push(`DTSTART:${startStr}`);
            ics.push(`DTEND:${endStr}`);
            ics.push(`SUMMARY:${task.name}${task.category ? ` [${task.category}]` : ''}`);
            if (task.memo) {
                ics.push(`DESCRIPTION:${task.memo.replace(/\n/g, '\\n')}`);
            }
            ics.push('END:VEVENT');
        });

        ics.push('END:VCALENDAR');

        const icsContent = ics.join('\r\n');

        res.set({
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="kurotask-${user.id}.ics"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        res.send(icsContent);
    } catch (error) {
        console.error('[CalendarFeed] Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
