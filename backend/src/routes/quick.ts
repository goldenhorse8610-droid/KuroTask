import { Router, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';
import { parseQuickCommand } from '../services/quickParser';

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

// GET /quick - 履歴取得
router.get('/', async (req: any, res: Response) => {
    try {
        const messages = await prisma.quickChatMessage.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            take: 100
        });
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /quick - メッセージ送信 & コマンド実行
router.post('/', async (req: any, res: Response) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        // 1. ユーザーメッセージを保存
        const userMsg = await prisma.quickChatMessage.create({
            data: {
                userId: req.user.id,
                role: 'user',
                content
            }
        });

        // 2. 解析
        const parsed = parseQuickCommand(content);
        let systemResponse = '';
        let relatedId: string | undefined;
        let relatedType: string | undefined;

        if (parsed.action === 'message') {
            systemResponse = 'コマンドを入力するには / から始めてください。例: /help';
        } else if (parsed.action === 'help') {
            systemResponse = `
【KuroTask クイックコマンド一覧】
/task [名] @[カテゴリ] #[メモ] - タスクを新規作成
/start [キーワード] - タスクを検索して開始
/stop - すべてのタイマーを停止
/help - このヘルプを表示
            `.trim();
        } else if (parsed.action === 'create_task') {
            const task = await prisma.task.create({
                data: {
                    userId: req.user.id,
                    name: parsed.params.name!,
                    type: 'stopwatch', // デフォルト
                    category: parsed.params.category || null,
                    memo: parsed.params.memo || null
                }
            });
            systemResponse = `タスク「${task.name}」を作成しました。`;
            relatedId = task.id;
            relatedType = 'task';
        } else if (parsed.action === 'start_task') {
            // 検索
            const task = await prisma.task.findFirst({
                where: {
                    userId: req.user.id,
                    isArchived: false,
                    name: { contains: parsed.params.query }
                }
            });

            if (task) {
                // 開始 (API経由ではなく直接Prismaでセッション作成)
                await prisma.timerSession.create({
                    data: {
                        userId: req.user.id,
                        taskId: task.id,
                        mode: task.type === 'timer' ? 'countdown' : 'stopwatch',
                        plannedDurationSec: task.defaultTimerDurationSec,
                        startAt: new Date()
                    }
                });
                systemResponse = `「${task.name}」の計測を開始しました。`;
                relatedId = task.id;
                relatedType = 'task';
            } else {
                systemResponse = `「${parsed.params.query}」に一致するタスクが見つかりませんでした。`;
            }
        } else if (parsed.action === 'stop_all') {
            const now = new Date();
            const sessions = await prisma.timerSession.findMany({
                where: { userId: req.user.id, endAt: null }
            });

            for (const s of sessions) {
                const durationSec = Math.floor((now.getTime() - new Date(s.startAt).getTime()) / 1000);
                await prisma.timerSession.update({
                    where: { id: s.id },
                    data: {
                        endAt: now,
                        durationSec,
                        endReason: 'quick_stop'
                    }
                });
            }
            systemResponse = `${sessions.length} 個の計測を停止しました。`;
        } else {
            systemResponse = '未知のコマンドです。/help で使い方を確認してください。';
        }

        // 3. システムレスポンスを保存
        const sysMsg = await prisma.quickChatMessage.create({
            data: {
                userId: req.user.id,
                role: 'system',
                content: systemResponse,
                relatedEntityId: relatedId,
                relatedEntityType: relatedType
            }
        });

        res.json({ userMessage: userMsg, systemMessage: sysMsg });
    } catch (error) {
        console.error('Quick implementation error:', error);
        res.status(500).json({ error: 'Failed to process command' });
    }
});

export default router;
