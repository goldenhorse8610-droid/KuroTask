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
import syncRoutes from './routes/sync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow all for dev
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
