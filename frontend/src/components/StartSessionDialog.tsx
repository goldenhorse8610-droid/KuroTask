import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
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
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
    const [duration, setDuration] = useState('');
    const [startMemo, setStartMemo] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const handleTaskChange = (taskId: string) => {
        setSelectedTaskId(taskId);
        const task = tasks.find(t => t.id === taskId);

        // 繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励↓蠢懊§縺ｦ繝｢繝ｼ繝芽ｨｭ螳・
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
            alert('繧ｿ繧ｹ繧ｯ繧帝∈謚槭＠縺ｦ縺上□縺輔＞');
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
                alert('譌｢縺ｫ螳溯｡御ｸｭ縺ｮ繧ｻ繝・す繝ｧ繝ｳ縺後≠繧翫∪縺吶ょ・縺ｫ邨ゆｺ・＠縺ｦ縺上□縺輔＞縲・);
            } else {
                alert('繧ｻ繝・す繝ｧ繝ｳ縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content start-dialog" onClick={(e) => e.stopPropagation()}>
                <h2>險域ｸｬ髢句ｧ・/h2>
                <form onSubmit={handleStart}>
                    <div className="form-group">
                        <label>繧ｿ繧ｹ繧ｯ *</label>
                        <select
                            value={selectedTaskId}
                            onChange={(e) => handleTaskChange(e.target.value)}
                            required
                            autoFocus
                        >
                            <option value="">繧ｿ繧ｹ繧ｯ繧帝∈謚・/option>
                            {tasks.filter(t => t.type !== 'checklist').map((task) => (
                                <option key={task.id} value={task.id}>
                                    {task.name} ({task.type === 'timer' ? '繧ｿ繧､繝槭・' : '繧ｹ繝医ャ繝励え繧ｩ繝・メ'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>繝｢繝ｼ繝・*</label>
                        <div className="mode-selector">
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`}
                                onClick={() => setMode('stopwatch')}
                                disabled={selectedTask?.type === 'timer'}
                            >
                                竢ｱ・・繧ｹ繝医ャ繝励え繧ｩ繝・メ
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'countdown' ? 'active' : ''}`}
                                onClick={() => setMode('countdown')}
                                disabled={selectedTask?.type === 'stopwatch'}
                            >
                                竢ｰ 繧ｿ繧､繝槭・
                            </button>
                        </div>
                    </div>

                    {mode === 'countdown' && (
                        <div className="form-group">
                            <label>繧ｿ繧､繝槭・譎る俣・亥・・・*</label>
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
                        <label>髢句ｧ九Γ繝｢</label>
                        <textarea
                            value={startMemo}
                            onChange={(e) => setStartMemo(e.target.value)}
                            placeholder="縺薙・險域ｸｬ縺ｮ逶ｮ逧・ｄ繝｡繝｢"
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={loading}>
                            繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                        </button>
                        <button type="submit" className="primary" disabled={loading}>
                            {loading ? '髢句ｧ倶ｸｭ...' : '髢句ｧ・}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
