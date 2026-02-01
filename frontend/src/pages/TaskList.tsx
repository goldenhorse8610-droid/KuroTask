import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './TaskList.css';

interface Task {
    id: string;
    name: string;
    type: 'stopwatch' | 'timer' | 'checklist';
    category: string | null;
    isFavorite: boolean;
    isArchived: boolean;
    defaultTimerDurationSec: number | null;
}

export default function TaskList() {
    const { apiUrl } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.tasks);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = async (task: Task) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${apiUrl}/timer/start`, {
                taskId: task.id,
                mode: task.type === 'timer' ? 'countdown' : 'stopwatch',
                plannedDurationSec: task.defaultTimerDurationSec,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`${task.name} を開始しました`);
        } catch (error: any) {
            console.error('Failed to start task:', error);
            alert('開始に失敗しました');
        }
    };

    if (loading) {
        return <div className="task-list-loading">読み込み中...</div>;
    }

    return (
        <div className="task-list-container">
            <div className="task-list-header">
                <h1 className="page-title">タスク一覧 (コンパクト)</h1>
            </div>

            <div className="task-list-table-container">
                <table className="task-list-table">
                    <thead>
                        <tr>
                            <th>タイトル</th>
                            <th>カテゴリ</th>
                            <th>種別</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task) => (
                            <tr key={task.id} className="task-list-row">
                                <td className="task-name-cell">{task.name}</td>
                                <td className="task-category-cell">
                                    {task.category ? <span className="compact-category">{task.category}</span> : '-'}
                                </td>
                                <td className="task-type-cell">
                                    <span className={`compact-type-icon ${task.type}`}>
                                        {task.type === 'stopwatch' ? '⏱️' : task.type === 'timer' ? '⏰' : '✓'}
                                    </span>
                                </td>
                                <td className="task-actions-cell">
                                    {task.type !== 'checklist' && (
                                        <button className="compact-btn start" onClick={() => handleStartTask(task)}>▶</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tasks.length === 0 && (
                    <div className="empty-list">タスクがありません</div>
                )}
            </div>
        </div>
    );
}
