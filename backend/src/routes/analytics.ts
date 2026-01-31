import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// GET /analytics/data - 高度な統計集計
router.get('/data', async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { period, taskId, categoryId } = req.query;

        let startDate = new Date();
        let endDate = new Date();
        let groupBy: 'day' | 'month' | 'week' | 'hour' = 'day';

        // 期間設定
        if (period === 'year') {
            startDate = new Date(new Date().getFullYear(), 0, 1);
            groupBy = 'month';
        } else if (period === 'month') {
            startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            groupBy = 'day';
        } else if (period === 'week') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            groupBy = 'day';
        } else if (period === 'day') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            groupBy = 'hour';
        }

        // フィルタ構築
        const where: any = {
            userId,
            endAt: { not: null },
            startAt: { gte: startDate }
        };
        if (taskId && taskId !== 'all') where.taskId = taskId;
        if (categoryId && categoryId !== 'all') where.task = { category: categoryId };

        const sessions = await prisma.timerSession.findMany({
            where,
            include: { task: true }
        });

        // 集計ロジック
        const dataMap = new Map();

        sessions.forEach(s => {
            let key = '';
            const date = new Date(s.startAt);
            if (period === 'year') {
                key = `${date.getMonth() + 1}月`;
            } else if (period === 'day') {
                key = `${date.getHours()}時`;
            } else {
                key = `${date.getMonth() + 1}/${date.getDate()}`;
            }

            const current = dataMap.get(key) || 0;
            dataMap.set(key, current + (s.durationSec || 0));
        });

        // ソート順の考慮（特に時間や日付）
        let chartData = Array.from(dataMap.entries()).map(([label, value]) => ({
            label,
            seconds: value
        }));

        if (period === 'day') {
            chartData.sort((a, b) => parseInt(a.label) - parseInt(b.label));
        } else if (period === 'year') {
            chartData.sort((a, b) => parseInt(a.label) - parseInt(b.label));
        }

        res.json({ chartData });
    } catch (error) {
        console.error('Advanced analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// GET /analytics/summary - (既存の互換性のために維持しつつ拡張)
router.get('/summary', async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // 1. 直近7日間の全セッション取得
        const sessions = await prisma.timerSession.findMany({
            where: {
                userId,
                endAt: { not: null },
                startAt: { gte: sevenDaysAgo }
            },
            include: { task: true }
        });

        // 2. 日別集計
        const dailyDataMap = new Map();
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            dailyDataMap.set(dateStr, { date: dateStr, minutes: 0 });
        }

        sessions.forEach(s => {
            const dateStr = new Date(s.startAt).toISOString().split('T')[0];
            if (dailyDataMap.has(dateStr)) {
                const current = dailyDataMap.get(dateStr);
                current.minutes += Math.floor((s.durationSec || 0) / 60);
            }
        });

        // 3. カテゴリ別集計 (全期間または直近)
        const categoryDataMap = new Map();
        sessions.forEach(s => {
            const cat = s.task.category || '未分類';
            const current = categoryDataMap.get(cat) || 0;
            categoryDataMap.set(cat, current + Math.floor((s.durationSec || 0) / 60));
        });

        res.json({
            daily: Array.from(dailyDataMap.values()),
            categories: Array.from(categoryDataMap.entries()).map(([name, value]) => ({ name, value }))
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

export default router;
