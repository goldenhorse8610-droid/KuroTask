import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import StartSessionDialog from '../components/StartSessionDialog';
import MiniTimerDisplay from '../components/MiniTimerDisplay';
import './Tasks.css';

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
    const { apiUrl } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [activeSessions, setActiveSessions] = useState<Session[]>([]);

    // 繝輔か繝ｼ繝迥ｶ諷・
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
            const res = await axios.get(`\/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.tasks);

            // 繧ｫ繝・ざ繝ｪ謚ｽ蜃ｺ
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
            const res = await axios.get(`\/timer/current`, {
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
            await axios.post(`\/timer/start`, {
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
                alert('縺薙・繧ｿ繧ｹ繧ｯ縺ｯ譌｢縺ｫ螳溯｡御ｸｭ縺ｧ縺・);
            } else {
                alert('髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
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
                await axios.patch(`\/tasks/${editingTask.id}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`\/tasks`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchTasks();
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('繧ｿ繧ｹ繧ｯ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
        }
    };

    const handleToggleFavorite = async (taskId: string) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`\/tasks/${taskId}/toggle-favorite`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const handleArchive = async (taskId: string) => {
        if (!confirm('縺薙・繧ｿ繧ｹ繧ｯ繧偵い繝ｼ繧ｫ繧､繝悶＠縺ｾ縺吶°・・)) return;

        const token = localStorage.getItem('token');
        try {
            await axios.post(`\/tasks/${taskId}/archive`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to archive task:', error);
            alert('繧｢繝ｼ繧ｫ繧､繝悶↓螟ｱ謨励＠縺ｾ縺励◆');
        }
    };

    const getTaskTypeLabel = (type: string) => {
        switch (type) {
            case 'stopwatch': return '竢ｱ・・繧ｹ繝医ャ繝励え繧ｩ繝・メ';
            case 'timer': return '竢ｰ 繧ｿ繧､繝槭・';
            case 'checklist': return '笨・繝√ぉ繝・け';
            default: return type;
        }
    };

    if (loading) {
        return <div className="tasks-loading">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>;
    }

    return (
        <div className="tasks-container">
            <div className="tasks-header">
                <h1 className="page-title">Tasks</h1>
                <button className="create-button primary" onClick={openCreateModal}>
                    ・・繧ｿ繧ｹ繧ｯ菴懈・
                </button>
            </div>

            {tasks.length === 0 ? (
                <div className="empty-state">
                    <p>縺ｾ縺繧ｿ繧ｹ繧ｯ縺後≠繧翫∪縺帙ｓ</p>
                    <p className="hint">縲鯉ｼ・繧ｿ繧ｹ繧ｯ菴懈・縲阪°繧芽ｿｽ蜉縺励※縺上□縺輔＞</p>
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
                                        title={task.isFavorite ? '縺頑ｰ励↓蜈･繧願ｧ｣髯､' : '縺頑ｰ励↓蜈･繧顔匳骭ｲ'}
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
                                        繝・ヵ繧ｩ繝ｫ繝・ {task.defaultTimerDurationSec / 60}蛻・
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
                                            {task.totalMinutes || 0}蛻・
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
                                            笆ｶ 髢句ｧ・
                                        </button>
                                    )}
                                    <button className="edit-btn secondary" onClick={() => openEditModal(task)}>
                                        邱ｨ髮・
                                    </button>
                                    <button className="archive-btn danger" onClick={() => handleArchive(task.id)}>
                                        繧｢繝ｼ繧ｫ繧､繝・
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 繧ｿ繧ｹ繧ｯ菴懈・/邱ｨ髮・Δ繝ｼ繝繝ｫ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingTask ? '繧ｿ繧ｹ繧ｯ邱ｨ髮・ : '繧ｿ繧ｹ繧ｯ菴懈・'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>繧ｿ繧ｹ繧ｯ蜷・*</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>遞ｮ蛻･ *</label>
                                <select value={formType} onChange={(e) => setFormType(e.target.value as any)} disabled={!!editingTask}>
                                    <option value="stopwatch">繧ｹ繝医ャ繝励え繧ｩ繝・メ險域ｸｬ</option>
                                    <option value="timer">繧ｿ繧､繝槭・險域ｸｬ</option>
                                    <option value="checklist">繝√ぉ繝・け繝ｪ繧ｹ繝・/option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>繧ｫ繝・ざ繝ｪ</label>
                                {!showNewCategory && categories.length > 0 ? (
                                    <div className="category-selector">
                                        <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                                            <option value="">繧ｫ繝・ざ繝ｪ縺ｪ縺・/option>
                                            {categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="new-category-btn" onClick={() => setShowNewCategory(true)}>
                                            ・区眠隕・
                                        </button>
                                    </div>
                                ) : (
                                    <div className="category-input">
                                        <input
                                            type="text"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            placeholder="譁ｰ縺励＞繧ｫ繝・ざ繝ｪ蜷・
                                        />
                                        {categories.length > 0 && (
                                            <button type="button" className="cancel-new-btn" onClick={() => setShowNewCategory(false)}>
                                                譌｢蟄倥°繧蛾∈謚・
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>繝｡繝｢</label>
                                <textarea
                                    value={formMemo}
                                    onChange={(e) => setFormMemo(e.target.value)}
                                    placeholder="縺薙・繧ｿ繧ｹ繧ｯ縺ｮ隧ｳ邏ｰ繧・岼逧・ｒ險伜・"
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
                                            謾ｾ鄂ｮ逶｣隕悶ｒ譛牙柑蛹・
                                        </label>
                                    </div>

                                    {formType === 'timer' && (
                                        <div className="form-group">
                                            <label>繝・ヵ繧ｩ繝ｫ繝医ち繧､繝槭・譎る俣・亥・・・/label>
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
                                    繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                                </button>
                                <button type="submit" className="primary">
                                    {editingTask ? '譖ｴ譁ｰ' : '菴懈・'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 險域ｸｬ髢句ｧ九ム繧､繧｢繝ｭ繧ｰ (Home遲峨〒菴ｿ逕ｨ) */}
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
