import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import tasksRoutes from './routes/tasks';
import wakeRoutes from './routes/wake';
import timerRoutes from './routes/timer';
import settingsRoutes from './routes/settings';
import quickRoutes from './routes/quick';
import recurringRoutes from './routes/recurring';
import idleMonitorRoutes from './routes/idleMonitor';
import analyticsRoutes from './routes/analytics';
import calendarRoutes from './routes/calendar';
import calendarFeedRoutes from './routes/calendarFeed';
import syncRoutes from './routes/sync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow Vercel frontend and local development
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        const allowedOrigins = [
            'https://kuro-task-wcmu.vercel.app',
            'http://localhost:5173'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin.match(/^http:\/\/(localhost|192\.168\.\d+\.\d+):\d+$/)) {
            callback(null, true);
        } else {
            console.log('[CORS] Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/tasks', tasksRoutes);
app.use('/wake', wakeRoutes);
app.use('/timer', timerRoutes);
app.use('/settings', settingsRoutes);
app.use('/quick', quickRoutes);
app.use('/recurring', recurringRoutes);
app.use('/idle-monitor', idleMonitorRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/calendar', calendarRoutes);
app.use('/calendar-feed', calendarFeedRoutes);
app.use('/sync', syncRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'KuroTask Backend v1.2 is running' });
});

app.get('/', (req, res) => {
    res.send('KuroTask API v1.2');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`- Local: http://localhost:${PORT}`);
});
