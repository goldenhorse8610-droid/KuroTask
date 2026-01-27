import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star } from 'lucide-react';
import StartSessionDialog from '../components/StartSessionDialog';
import MiniTimerDisplay from '../components/MiniTimerDisplay';
import './Tasks.css';

const API_BASE = `http://${window.location.hostname}:3000`;

interface Task {
    id: string;
    name: string;
    type: 'stopwatch' | 'timer' | 'checklist';
    category: string | null;
    memo: string | null;
    isFavorite: boolean;
    idleMonitorEnabled: boolean;
    defaultTimerDurationSec: number | null;
    isArchived: boolean;
    createdAt: string;
    _count?: {
        timerSessions: number;
    };
    totalMinutes?: number;
}

interface Session {
    id: string;
    taskId: string;
    mode: string;
    plannedDurationSec: number | null;
    startAt: string;
}

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [activeSessions, setActiveSessions] = useState<Session[]>([]);

    // フォーム状態
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<'stopwatch' | 'timer' | 'checklist'>('stopwatch');
    const [formCategory, setFormCategory] = useState('');
    const [formMemo, setFormMemo] = useState('');
    const [formIdleMonitor, setFormIdleMonitor] = useState(false);
    const [formDefaultDuration, setFormDefaultDuration] = useState('');
    const [showNewCategory, setShowNewCategory] = useState(false);

    useEffect(() => {
        fetchTasks();
        fetchActiveSessions();
    }, []);

    const fetchTasks = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_BASE}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.tasks);

            // カテゴリ抽出
            const uniqueCategories = Array.from(
                new Set(res.data.tasks.map((t: Task) => t.category).filter(Boolean))
            ) as string[];
            setCategories(uniqueCategories);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveSessions = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_BASE}/timer/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveSessions(res.data.sessions || []);
        } catch (error) {
            console.error('Failed to fetch active sessions:', error);
        }
    };

    const handleStartTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE}/timer/start`, {
                taskId: task.id,
                mode: task.type === 'timer' ? 'countdown' : 'stopwatch',
                plannedDurationSec: task.defaultTimerDurationSec,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchActiveSessions();
            fetchTasks();
        } catch (error: any) {
            console.error('Failed to start task:', error);
            if (error.response?.data?.error === 'Task already running') {
                alert('このタスクは既に実行中です');
            } else {
                alert('開始に失敗しました');
            }
        }
    };

    const openCreateModal = () => {
        setEditingTask(null);
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormName(task.name);
        setFormType(task.type);
        setFormCategory(task.category || '');
        setFormMemo(task.memo || '');
        setFormIdleMonitor(task.idleMonitorEnabled);
        setFormDefaultDuration(task.defaultTimerDurationSec ? (task.defaultTimerDurationSec / 60).toString() : '');
        setShowNewCategory(false);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormName('');
        setFormType('stopwatch');
        setFormCategory('');
        setFormMemo('');
        setFormIdleMonitor(false);
        setFormDefaultDuration('');
        setShowNewCategory(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const data = {
            name: formName,
            type: formType,
            category: formCategory || null,
            memo: formMemo || null,
            idleMonitorEnabled: formType !== 'checklist' ? formIdleMonitor : false,
            defaultTimerDurationSec: formType === 'timer' && formDefaultDuration
                ? parseInt(formDefaultDuration) * 60
                : null,
        };

        try {
            if (editingTask) {
                await axios.patch(`${API_BASE}/tasks/${editingTask.id}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE}/tasks`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchTasks();
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('タスクの保存に失敗しました');
        }
    };

    const handleToggleFavorite = async (taskId: string) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE}/tasks/${taskId}/toggle-favorite`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const handleArchive = async (taskId: string) => {
        if (!confirm('このタスクをアーカイブしますか？')) return;

        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE}/tasks/${taskId}/archive`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to archive task:', error);
            alert('アーカイブに失敗しました');
        }
    };

    const getTaskTypeLabel = (type: string) => {
        switch (type) {
            case 'stopwatch': return '⏱️ ストップウォッチ';
            case 'timer': return '⏰ タイマー';
            case 'checklist': return '✓ チェック';
            default: return type;
        }
    };

    if (loading) {
        return <div className="tasks-loading">読み込み中...</div>;
    }

    return (
        <div className="tasks-container">
            <div className="tasks-header">
                <h1 className="page-title">Tasks</h1>
                <button className="create-button primary" onClick={openCreateModal}>
                    ＋ タスク作成
                </button>
            </div>

            {tasks.length === 0 ? (
                <div className="empty-state">
                    <p>まだタスクがありません</p>
                    <p className="hint">「＋ タスク作成」から追加してください</p>
                </div>
            ) : (
                <div className="tasks-grid">
                    {tasks.map((task) => {
                        const taskActiveSessions = activeSessions.filter(s => s.taskId === task.id);
                        const isRunning = taskActiveSessions.length > 0;

                        return (
                            <div key={task.id} className="task-card">
                                <div className="task-header">
                                    <div className="task-header-left">
                                        <span className={`task-type ${task.type}`}>
                                            {getTaskTypeLabel(task.type)}
                                        </span>
                                        {task.category && (
                                            <span className="task-category">{task.category}</span>
                                        )}
                                    </div>
                                    <button
                                        className={`favorite-btn ${task.isFavorite ? 'active' : ''}`}
                                        onClick={() => handleToggleFavorite(task.id)}
                                        title={task.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
                                    >
                                        <Star size={20} fill={task.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <h3 className="task-name">{task.name}</h3>
                                {task.memo && (
                                    <p className="task-memo">{task.memo}</p>
                                )}
                                {task.type === 'timer' && task.defaultTimerDurationSec && (
                                    <p className="task-detail">
                                        デフォルト: {task.defaultTimerDurationSec / 60}分
                                    </p>
                                )}
                                {isRunning ? (
                                    taskActiveSessions.map(session => (
                                        <MiniTimerDisplay
                                            key={session.id}
                                            startAt={session.startAt}
                                            mode={session.mode}
                                            plannedDurationSec={session.plannedDurationSec}
                                        />
                                    ))
                                ) : (
                                    (task.type === 'stopwatch' || task.type === 'timer') && (
                                        <p className="task-time">
                                            {task.totalMinutes || 0}分
                                        </p>
                                    )
                                )}
                                <div className="task-actions">
                                    {task.type !== 'checklist' && (
                                        <button
                                            className="start-btn success"
                                            onClick={() => handleStartTask(task.id)}
                                            disabled={isRunning}
                                        >
                                            ▶ 開始
                                        </button>
                                    )}
                                    <button className="edit-btn secondary" onClick={() => openEditModal(task)}>
                                        編集
                                    </button>
                                    <button className="archive-btn danger" onClick={() => handleArchive(task.id)}>
                                        アーカイブ
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* タスク作成/編集モーダル */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingTask ? 'タスク編集' : 'タスク作成'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>タスク名 *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>種別 *</label>
                                <select value={formType} onChange={(e) => setFormType(e.target.value as any)} disabled={!!editingTask}>
                                    <option value="stopwatch">ストップウォッチ計測</option>
                                    <option value="timer">タイマー計測</option>
                                    <option value="checklist">チェックリスト</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>カテゴリ</label>
                                {!showNewCategory && categories.length > 0 ? (
                                    <div className="category-selector">
                                        <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                                            <option value="">カテゴリなし</option>
                                            {categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="new-category-btn" onClick={() => setShowNewCategory(true)}>
                                            ＋新規
                                        </button>
                                    </div>
                                ) : (
                                    <div className="category-input">
                                        <input
                                            type="text"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            placeholder="新しいカテゴリ名"
                                        />
                                        {categories.length > 0 && (
                                            <button type="button" className="cancel-new-btn" onClick={() => setShowNewCategory(false)}>
                                                既存から選択
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>メモ</label>
                                <textarea
                                    value={formMemo}
                                    onChange={(e) => setFormMemo(e.target.value)}
                                    placeholder="このタスクの詳細や目的を記入"
                                    rows={3}
                                />
                            </div>

                            {formType !== 'checklist' && (
                                <>
                                    <div className="form-group checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formIdleMonitor}
                                                onChange={(e) => setFormIdleMonitor(e.target.checked)}
                                            />
                                            放置監視を有効化
                                        </label>
                                    </div>

                                    {formType === 'timer' && (
                                        <div className="form-group">
                                            <label>デフォルトタイマー時間（分）</label>
                                            <input
                                                type="number"
                                                value={formDefaultDuration}
                                                onChange={(e) => setFormDefaultDuration(e.target.value)}
                                                placeholder="25"
                                                min="1"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>
                                    キャンセル
                                </button>
                                <button type="submit" className="primary">
                                    {editingTask ? '更新' : '作成'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 計測開始ダイアログ (Home等で使用) */}
            {showStartDialog && (
                <StartSessionDialog
                    tasks={tasks}
                    onClose={() => {
                        setShowStartDialog(false);
                    }}
                    onStart={() => {
                        fetchTasks();
                        fetchActiveSessions();
                    }}
                />
            )}
        </div>
    );
}
