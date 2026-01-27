import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
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
            // 螳溯｡御ｸｭ繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ・(隍・焚)
            const sessionRes = await axios.get(`${apiUrl}/timer/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveSessions(sessionRes.data.sessions || []);

            // 險ｭ螳壼叙蠕・
            const settingsRes = await axios.get(`${apiUrl}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(settingsRes.data.settings);

            // 謾ｾ鄂ｮ繧ｿ繧ｹ繧ｯ蜿門ｾ・
            const idleRes = await axios.get(`${apiUrl}/idle-monitor/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIdleTasks(idleRes.data.idleTasks || []);

            // 繧ｿ繧ｹ繧ｯ荳隕ｧ蜿門ｾ・
            const tasksRes = await axios.get(`${apiUrl}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(tasksRes.data.tasks);

            // 莉頑律縺ｮ襍ｷ蠎願ｨ倬鹸蜿門ｾ・
            const wakeRes = await axios.get(`${apiUrl}/wake/today`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTodayWake(wakeRes.data.log);

            // 莉頑律縺ｮ邨ｱ險・
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
                alert('譌｢縺ｫ螳溯｡御ｸｭ縺ｮ繧ｻ繝・す繝ｧ繝ｳ縺後≠繧翫∪縺吶・);
            } else {
                alert('繧ｻ繝・す繝ｧ繝ｳ縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
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
                alert('笞・・10譎ゅｒ驕弱℃縺ｦ縺・∪縺呻ｼ・);
            }
        } catch (error: any) {
            console.error('Failed to record wake:', error);
            if (error.response?.data?.error === 'Already recorded today') {
                alert('莉頑律縺ｯ縺吶〒縺ｫ險倬鹸貂医∩縺ｧ縺・);
            } else {
                alert('襍ｷ蠎願ｨ倬鹸縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
            }
        } finally {
            setRecordingWake(false);
        }
    };

    const handleResetWake = async () => {
        if (!window.confirm('襍ｷ蠎願ｨ倬鹸繧偵Μ繧ｻ繝・ヨ縺励∪縺吶よ悽蠖薙↓險倬鹸繧偵ｄ繧顔峩縺励∪縺吶°・・)) {
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
            alert('繝ｪ繧ｻ繝・ヨ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
        }
    };

    const formatWakeTime = (wakeAt: string) => {
        const date = new Date(wakeAt);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    if (loading) {
        return <div className="home-loading">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>;
    }

    const favoriteTasks = tasks.filter(t => t.isFavorite && !t.isArchived);

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 className="page-title">Home</h1>
                {tasks.filter(t => t.type !== 'checklist').length > 0 && (
                    <button className="start-session-btn primary" onClick={() => setShowStartDialog(true)}>
                        笆ｶ 險域ｸｬ髢句ｧ・
                    </button>
                )}
            </div>

            {/* (1) 螳溯｡御ｸｭ繧ｻ繝・す繝ｧ繝ｳ繧ｫ繝ｼ繝・(隍・焚陦ｨ遉ｺ蟇ｾ蠢・ */}
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
                        <p>迴ｾ蝨ｨ螳溯｡御ｸｭ縺ｮ繧ｻ繝・す繝ｧ繝ｳ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
                        <p className="hint">縲娯霧 險域ｸｬ髢句ｧ九阪∪縺溘・ Tasks縺九ｉ髢句ｧ九〒縺阪∪縺・/p>
                    </div>
                )}
            </div>

            <div className="home-grid">
                {/* (2) 襍ｷ蠎翫・繧ｿ繝ｳ */}
                <div className={`card wake-card ${todayWake?.warned ? 'warned' : ''}`}>
                    <h3>襍ｷ蠎願ｨ倬鹸</h3>
                    {todayWake ? (
                        <>
                            <div className="wake-recorded">
                                <span className="wake-time">{formatWakeTime(todayWake.wakeAt)}</span>
                                <span className="wake-status">險倬鹸貂医∩ 笨・/span>
                                <button
                                    className="reset-wake-btn"
                                    onClick={handleResetWake}
                                >
                                    險倬鹸繧偵ｄ繧顔峩縺・
                                </button>
                            </div>
                            {todayWake.warned && (
                                <p className="wake-warning">笞・・10譎りｶ・∴</p>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                className="wake-button success"
                                onClick={handleRecordWake}
                                disabled={recordingWake}
                            >
                                {recordingWake ? '險倬鹸荳ｭ...' : '襍ｷ蠎・}
                            </button>
                            <p className="wake-hint">莉頑律縺ｮ襍ｷ蠎頑凾蛻ｻ繧定ｨ倬鹸</p>
                        </>
                    )}
                </div>

                {/* (3) 莉頑律縺ｮ蜍昴■ */}
                <div className="card stats-card">
                    <h3>莉頑律縺ｮ蜍昴■</h3>
                    <div className="stat-item">
                        <span className="stat-label">險域ｸｬ譎る俣</span>
                        <span className="stat-value">{todayStats.totalMinutes}蛻・/span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">螳御ｺ・/span>
                        <span className="stat-value">{todayStats.completedCount}莉ｶ</span>
                    </div>
                </div>
            </div>

            {/* (4) 謾ｾ鄂ｮ繧ｿ繧ｹ繧ｯ繝ｪ繝槭う繝ｳ繝・*/}
            {idleTasks.length > 0 && (
                <div className="idle-reminders-section">
                    <h3>縺励・繧峨￥繧・▲縺ｦ縺・↑縺・ち繧ｹ繧ｯ</h3>
                    <div className="idle-grid">
                        {idleTasks.map(task => (
                            <div key={task.id} className="idle-task-card" onClick={() => handleStartTask(task.id)}>
                                <span className="idle-warning-icon">笞・・/span>
                                <div className="idle-task-info">
                                    <span className="idle-task-name">{task.name}</span>
                                    <span className="idle-task-days">譛蠕・ {new Date(task.lastActive).toLocaleDateString()}</span>
                                </div>
                                <button className="idle-start-btn">髢句ｧ・/button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* (5) 繧医￥菴ｿ縺・ち繧ｹ繧ｯ */}
            <div className="shortcuts-section">
                <h3>繧医￥菴ｿ縺・ち繧ｹ繧ｯ</h3>
                {favoriteTasks.length > 0 ? (
                    <div className="favorite-grid">
                        {favoriteTasks.map(task => {
                            const isRunning = activeSessions.some(s => s.taskId === task.id);
                            return (
                                <div key={task.id} className="favorite-task-card" onClick={() => !isRunning && handleStartTask(task.id)}>
                                    <div className="fav-header">
                                        <span className={`task-type-dot ${task.type}`}></span>
                                        <span className="fav-category">{task.category || '荳闊ｬ'}</span>
                                    </div>
                                    <div className="fav-name">{task.name}</div>
                                    {isRunning && <div className="is-running-tag">螳溯｡御ｸｭ</div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="shortcuts-placeholder">
                        <p>縺頑ｰ励↓蜈･繧翫・繧ｿ繧ｹ繧ｯ縺後≠繧翫∪縺帙ｓ</p>
                        <p className="hint">Tasks繧ｿ繝悶〒 笘・繧偵け繝ｪ繝・け縺励※逋ｻ骭ｲ縺励※縺上□縺輔＞</p>
                    </div>
                )}
            </div>

            {/* 險域ｸｬ髢句ｧ九ム繧､繧｢繝ｭ繧ｰ */}
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
