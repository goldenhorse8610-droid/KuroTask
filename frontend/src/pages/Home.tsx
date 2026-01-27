import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ActiveSessionCard from '../components/ActiveSessionCard';
import StartSessionDialog from '../components/StartSessionDialog';
import './Home.css';

interface WakeLog {
    id: string;
    date: string;
    wakeAt: string;
    warned: boolean;
    isRestDay: boolean;
}

interface Task {
    id: string;
    name: string;
    type: string;
    isFavorite: boolean;
    isArchived: boolean;
    category: string | null;
    defaultTimerDurationSec: number | null;
}

export default function Home() {
    const { apiUrl } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [todayStats, setTodayStats] = useState({ totalMinutes: 0, completedCount: 0 });
    const [todayWake, setTodayWake] = useState<WakeLog | null>(null);
    const [recordingWake, setRecordingWake] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [idleTasks, setIdleTasks] = useState<any[]>([]);

    useEffect(() => {
        fetchHomeData();
    }, []);

    const fetchHomeData = async () => {
        const token = localStorage.getItem('token');
        try {
            // 実行中セッション取得 (複数)
            const sessionRes = await axios.get(`${apiUrl}/timer/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveSessions(sessionRes.data.sessions || []);

            // 設定取得
            const settingsRes = await axios.get(`${apiUrl}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(settingsRes.data.settings);

            // 放置タスク取得
            const idleRes = await axios.get(`${apiUrl}/idle-monitor/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIdleTasks(idleRes.data.idleTasks || []);

            // タスク一覧取得
            const tasksRes = await axios.get(`${apiUrl}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(tasksRes.data.tasks);

            // 今日の起床記録取得
            const wakeRes = await axios.get(`${apiUrl}/wake/today`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTodayWake(wakeRes.data.log);

            // 今日の統計
            setTodayStats({ totalMinutes: 0, completedCount: 0 });

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch home data:', error);
            setLoading(false);
        }
    };

    const handleStartTask = async (taskId: string) => {
        const token = localStorage.getItem('token');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            await axios.post(`${apiUrl}/timer/start`, {
                taskId: task.id,
                mode: task.type === 'timer' ? 'countdown' : 'stopwatch',
                plannedDurationSec: task.defaultTimerDurationSec,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchHomeData();
        } catch (error: any) {
            console.error('Failed to start session:', error);
            if (error.response?.data?.error === 'Already running' || error.response?.data?.error === 'Task already running') {
                alert('既に実行中のセッションがあります。');
            } else {
                alert('セッションの開始に失敗しました');
            }
        }
    };

    const handleRecordWake = async () => {
        const token = localStorage.getItem('token');
        setRecordingWake(true);

        try {
            const res = await axios.post(`${apiUrl}/wake`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTodayWake(res.data.wakeLog);

            if (res.data.wakeLog.warned) {
                alert('⚠️ 10時を過ぎています！');
            }
        } catch (error: any) {
            console.error('Failed to record wake:', error);
            if (error.response?.data?.error === 'Already recorded today') {
                alert('今日はすでに記録済みです');
            } else {
                alert('起床記録に失敗しました');
            }
        } finally {
            setRecordingWake(false);
        }
    };

    const handleResetWake = async () => {
        if (!window.confirm('起床記録をリセットします。本当に記録をやり直しますか？')) {
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${apiUrl}/wake/today`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchHomeData();
        } catch (error) {
            console.error('Failed to reset wake log:', error);
            alert('リセットに失敗しました');
        }
    };

    const formatWakeTime = (wakeAt: string) => {
        const date = new Date(wakeAt);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    if (loading) {
        return <div className="home-loading">読み込み中...</div>;
    }

    const favoriteTasks = tasks.filter(t => t.isFavorite && !t.isArchived);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 className="page-title">Home</h1>
                {tasks.filter(t => t.type !== 'checklist').length > 0 && (
                    <button className="start-session-btn primary" onClick={() => setShowStartDialog(true)}>
                        ▶ 計測開始
                    </button>
                )}
            </div>

            {/* (1) 実行中セッションカード (複数表示対応) */}
            <div className="active-sessions-list">
                {activeSessions.length > 0 ? (
                    activeSessions.map(session => (
                        <ActiveSessionCard
                            key={session.id}
                            session={session}
                            settings={settings}
                            onStop={fetchHomeData}
                        />
                    ))
                ) : (
                    <div className="session-placeholder">
                        <p>現在実行中のセッションはありません</p>
                        <p className="hint">「▶ 計測開始」または Tasksから開始できます</p>
                    </div>
                )}
            </div>

            <div className="home-grid">
                {/* (2) 起床ボタン */}
                <div className={`card wake-card ${todayWake?.warned ? 'warned' : ''}`}>
                    <h3>起床記録</h3>
                    {todayWake ? (
                        <>
                            <div className="wake-recorded">
                                <span className="wake-time">{formatWakeTime(todayWake.wakeAt)}</span>
                                <span className="wake-status">記録済み ✓</span>
                                <button
                                    className="reset-wake-btn"
                                    onClick={handleResetWake}
                                >
                                    記録をやり直す
                                </button>
                            </div>
                            {todayWake.warned && (
                                <p className="wake-warning">⚠️ 10時超え</p>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                className="wake-button success"
                                onClick={handleRecordWake}
                                disabled={recordingWake}
                            >
                                {recordingWake ? '記録中...' : '起床'}
                            </button>
                            <p className="wake-hint">今日の起床時刻を記録</p>
                        </>
                    )}
                </div>

                {/* (3) 今日の勝ち */}
                <div className="card stats-card">
                    <h3>今日の勝ち</h3>
                    <div className="stat-item">
                        <span className="stat-label">計測時間</span>
                        <span className="stat-value">{todayStats.totalMinutes}分</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">完了</span>
                        <span className="stat-value">{todayStats.completedCount}件</span>
                    </div>
                </div>
            </div>

            {/* (4) 放置タスクリマインド */}
            {idleTasks.length > 0 && (
                <div className="idle-reminders-section">
                    <h3>しばらくやっていないタスク</h3>
                    <div className="idle-grid">
                        {idleTasks.map(task => (
                            <div key={task.id} className="idle-task-card" onClick={() => handleStartTask(task.id)}>
                                <span className="idle-warning-icon">⚠️</span>
                                <div className="idle-task-info">
                                    <span className="idle-task-name">{task.name}</span>
                                    <span className="idle-task-days">最後: {new Date(task.lastActive).toLocaleDateString()}</span>
                                </div>
                                <button className="idle-start-btn">開始</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* (5) よく使うタスク */}
            <div className="shortcuts-section">
                <h3>よく使うタスク</h3>
                {favoriteTasks.length > 0 ? (
                    <div className="favorite-grid">
                        {favoriteTasks.map(task => {
                            const isRunning = activeSessions.some(s => s.taskId === task.id);
                            return (
                                <div key={task.id} className="favorite-task-card" onClick={() => !isRunning && handleStartTask(task.id)}>
                                    <div className="fav-header">
                                        <span className={`task-type-dot ${task.type}`}></span>
                                        <span className="fav-category">{task.category || '一般'}</span>
                                    </div>
                                    <div className="fav-name">{task.name}</div>
                                    {isRunning && <div className="is-running-tag">実行中</div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="shortcuts-placeholder">
                        <p>お気に入りのタスクがありません</p>
                        <p className="hint">Tasksタブで ☆ をクリックして登録してください</p>
                    </div>
                )}
            </div>

            {/* 計測開始ダイアログ */}
            {showStartDialog && (
                <StartSessionDialog
                    tasks={tasks}
                    onClose={() => setShowStartDialog(false)}
                    onStart={fetchHomeData}
                />
            )}
        </div>
    );
}
