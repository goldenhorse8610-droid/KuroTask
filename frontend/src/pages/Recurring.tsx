import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Recurring.css';


interface Task {
    id: string;
    name: string;
}

interface RecurringRule {
    id: string;
    taskId: string;
    task: Task;
    ruleType: string;
    reminderEnabled: boolean;
    reminderStartTime: string | null;
}

export default function Recurring() {
    const { apiUrl } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rules, setRules] = useState<RecurringRule[]>([]);
    const [loading, setLoading] = useState(true);

    // フォーム
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [ruleType, setRuleType] = useState('daily');
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            const [tasksRes, rulesRes] = await Promise.all([
                axios.get(`${apiUrl}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/recurring`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setTasks(tasksRes.data.tasks.filter((t: any) => t.type !== 'checklist'));
            setRules(rulesRes.data.rules);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId) return;

        const token = localStorage.getItem('token');
        try {
            await axios.post(`${apiUrl}/recurring`, {
                taskId: selectedTaskId,
                ruleType,
                reminderEnabled,
                reminderStartTime: reminderEnabled ? reminderTime : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
            setSelectedTaskId('');
        } catch (error) {
            console.error('Failed to save rule:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('こ�E設定を解除しますか�E�E)) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${apiUrl}/recurring/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    if (loading) return <div className="loading">読み込み中...</div>;

    return (
        <div className="recurring-container">
            <h1 className="page-title">Recurring Tasks</h1>

            <div className="recurring-grid">
                <div className="rule-form-section">
                    <div className="card">
                        <h3>繰り返し設定を追加</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>タスクを選抁E/label>
                                <select
                                    value={selectedTaskId}
                                    onChange={(e) => setSelectedTaskId(e.target.value)}
                                    required
                                >
                                    <option value="">タスクを選択してください</option>
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>頻度</label>
                                <select value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
                                    <option value="daily">毎日</option>
                                    <option value="weekly">毎週</option>
                                </select>
                            </div>

                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={reminderEnabled}
                                        onChange={(e) => setReminderEnabled(e.target.checked)}
                                    />
                                    リマインド通知を有効にする
                                </label>
                            </div>

                            {reminderEnabled && (
                                <div className="form-group">
                                    <label>通知時刻</label>
                                    <input
                                        type="time"
                                        value={reminderTime}
                                        onChange={(e) => setReminderTime(e.target.value)}
                                    />
                                </div>
                            )}

                            <button type="submit" className="primary full-width" disabled={!selectedTaskId}>
                                設定を保孁E
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rules-list-section">
                    <h3>現在の設定一覧</h3>
                    {rules.length === 0 ? (
                        <div className="empty-rules">設定されてぁE��タスクはありません</div>
                    ) : (
                        <div className="rules-grid">
                            {rules.map(rule => (
                                <div key={rule.id} className="rule-card card">
                                    <div className="rule-info">
                                        <span className="rule-task-name">{rule.task.name}</span>
                                        <span className="rule-badge">{rule.ruleType === 'daily' ? '毎日' : '毎週'}</span>
                                    </div>
                                    <div className="rule-details">
                                        {rule.reminderEnabled ? (
                                            <span className="reminder-time">🔔 {rule.reminderStartTime}</span>
                                        ) : (
                                            <span className="reminder-off">通知なぁE/span>
                                        )}
                                    </div>
                                    <button
                                        className="delete-rule-btn danger sm"
                                        onClick={() => handleDelete(rule.id)}
                                    >
                                        解除
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
