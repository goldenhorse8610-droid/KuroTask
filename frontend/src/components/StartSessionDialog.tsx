import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './StartSessionDialog.css';

interface Task {
    id: string;
    name: string;
    type: string;
    defaultTimerDurationSec: number | null;
}

interface StartSessionDialogProps {
    tasks: Task[];
    onClose: () => void;
    onStart: () => void;
}

export default function StartSessionDialog({ tasks, onClose, onStart }: StartSessionDialogProps) {
    const { apiUrl } = useAuth();
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
    const [duration, setDuration] = useState('');
    const [startMemo, setStartMemo] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const handleTaskChange = (taskId: string) => {
        setSelectedTaskId(taskId);
        const task = tasks.find(t => t.id === taskId);

        // タスクタイプに応じてモード設定
        if (task?.type === 'timer' && task.defaultTimerDurationSec) {
            setMode('countdown');
            setDuration((task.defaultTimerDurationSec / 60).toString());
        } else if (task?.type === 'stopwatch') {
            setMode('stopwatch');
            setDuration('');
        }
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId) {
            alert('タスクを選択してください');
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');

        try {
            await axios.post(`${apiUrl}/timer/start`, {
                taskId: selectedTaskId,
                mode,
                plannedDurationSec: mode === 'countdown' && duration ? parseInt(duration) * 60 : null,
                startMemo: startMemo || null,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onStart();
            onClose();
        } catch (error: any) {
            console.error('Failed to start session:', error);
            if (error.response?.data?.error === 'Already running') {
                alert('既に実行中のセッションがあります。先に終了してください。');
            } else {
                alert('セッションの開始に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content start-dialog" onClick={(e) => e.stopPropagation()}>
                <h2>計測開始</h2>
                <form onSubmit={handleStart}>
                    <div className="form-group">
                        <label>タスク *</label>
                        <select
                            value={selectedTaskId}
                            onChange={(e) => handleTaskChange(e.target.value)}
                            required
                            autoFocus
                        >
                            <option value="">タスクを選択</option>
                            {tasks.filter(t => t.type !== 'checklist').map((task) => (
                                <option key={task.id} value={task.id}>
                                    {task.name} ({task.type === 'timer' ? 'タイマー' : 'ストップウォッチ'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>モード *</label>
                        <div className="mode-selector">
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`}
                                onClick={() => setMode('stopwatch')}
                                disabled={selectedTask?.type === 'timer'}
                            >
                                ⏱️ ストップウォッチ
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'countdown' ? 'active' : ''}`}
                                onClick={() => setMode('countdown')}
                                disabled={selectedTask?.type === 'stopwatch'}
                            >
                                ⏰ タイマー
                            </button>
                        </div>
                    </div>

                    {mode === 'countdown' && (
                        <div className="form-group">
                            <label>タイマー時間（分） *</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="25"
                                min="1"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>開始メモ</label>
                        <textarea
                            value={startMemo}
                            onChange={(e) => setStartMemo(e.target.value)}
                            placeholder="この計測の目的やメモ"
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={loading}>
                            キャンセル
                        </button>
                        <button type="submit" className="primary" disabled={loading}>
                            {loading ? '開始中...' : '開始'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
