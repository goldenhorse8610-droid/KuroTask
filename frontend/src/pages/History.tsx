import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './History.css';


interface Session {
    id: string;
    mode: string;
    startAt: string;
    endAt: string | null;
    durationSec: number | null;
    startMemo: string | null;
    endMemo: string | null;
    task: {
        id: string;
        name: string;
        category: string | null;
    };
}

export default function History() {
    const { apiUrl } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // 邱ｨ髮・Δ繝ｼ繝繝ｫ逕ｨ
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editEndMemo, setEditEndMemo] = useState('');

    useEffect(() => {
        fetchHistory();
    }, [page]);

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);
        try {
            const res = await axios.get(`${apiUrl}/timer/history?page=${page}&limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data.sessions);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('縺薙・險倬鹸繧貞炎髯､縺励∪縺吶°・・)) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${apiUrl}/timer/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchHistory();
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    const handleUpdateMemo = async () => {
        if (!editingSession) return;
        const token = localStorage.getItem('token');
        try {
            await axios.patch(`${apiUrl}/timer/sessions/${editingSession.id}`, {
                endMemo: editEndMemo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingSession(null);
            fetchHistory();
        } catch (error) {
            console.error('Failed to update memo:', error);
        }
    };

    const formatDuration = (sec: number | null) => {
        if (sec === null) return '-';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h ? h + 'h ' : ''}${m}m ${s}s`;
    };

    const formatDate = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && sessions.length === 0) return <div className="loading">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>;

    return (
        <div className="history-container">
            <h1 className="page-title">History</h1>

            <div className="history-list">
                {sessions.length === 0 ? (
                    <div className="empty-history">險倬鹸縺後≠繧翫∪縺帙ｓ</div>
                ) : (
                    sessions.map(s => (
                        <div key={s.id} className="history-card">
                            <div className="history-header">
                                <div className="history-task-info">
                                    <span className="history-task-name">{s.task.name}</span>
                                    <span className="history-category-badge">{s.task.category || '譛ｪ蛻・｡・}</span>
                                </div>
                                <div className="history-actions">
                                    <button className="edit-btn sm" onClick={() => {
                                        setEditingSession(s);
                                        setEditEndMemo(s.endMemo || '');
                                    }}>邱ｨ髮・/button>
                                    <button className="delete-btn danger sm" onClick={() => handleDelete(s.id)}>蜑企勁</button>
                                </div>
                            </div>
                            <div className="history-details">
                                <div className="detail-item">
                                    <span className="detail-label">譌･譎・</span>
                                    <span>{formatDate(s.startAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">譎る俣:</span>
                                    <span className="duration-value">{formatDuration(s.durationSec)}</span>
                                </div>
                                <div className="detail-item full">
                                    <span className="detail-label">繝｡繝｢:</span>
                                    <p className="history-memo">{s.endMemo || (s.startMemo ? s.startMemo : <span className="no-memo">縺ｪ縺・/span>)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>蜑阪∈</button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>谺｡縺ｸ</button>
                </div>
            )}

            {/* 邱ｨ髮・Δ繝ｼ繝繝ｫ */}
            {editingSession && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>繝｡繝｢繧堤ｷｨ髮・/h3>
                        <textarea
                            value={editEndMemo}
                            onChange={(e) => setEditEndMemo(e.target.value)}
                            rows={4}
                            placeholder="邨ゆｺ・Γ繝｢繧貞・蜉・
                        />
                        <div className="modal-actions">
                            <button className="secondary" onClick={() => setEditingSession(null)}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
                            <button className="primary" onClick={handleUpdateMemo}>菫晏ｭ・/button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
