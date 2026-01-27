import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
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

    // 編集モーダル用
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
        if (!confirm('この記録を削除しますか？')) return;
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

    if (loading && sessions.length === 0) return <div className="loading">読み込み中...</div>;

    return (
        <div className="history-container">
            <h1 className="page-title">History</h1>

            <div className="history-list">
                {sessions.length === 0 ? (
                    <div className="empty-history">記録がありません</div>
                ) : (
                    sessions.map(s => (
                        <div key={s.id} className="history-card">
                            <div className="history-header">
                                <div className="history-task-info">
                                    <span className="history-task-name">{s.task.name}</span>
                                    <span className="history-category-badge">{s.task.category || '未分類'}</span>
                                </div>
                                <div className="history-actions">
                                    <button className="edit-btn sm" onClick={() => {
                                        setEditingSession(s);
                                        setEditEndMemo(s.endMemo || '');
                                    }}>編集</button>
                                    <button className="delete-btn danger sm" onClick={() => handleDelete(s.id)}>削除</button>
                                </div>
                            </div>
                            <div className="history-details">
                                <div className="detail-item">
                                    <span className="detail-label">日時:</span>
                                    <span>{formatDate(s.startAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">時間:</span>
                                    <span className="duration-value">{formatDuration(s.durationSec)}</span>
                                </div>
                                <div className="detail-item full">
                                    <span className="detail-label">メモ:</span>
                                    <p className="history-memo">{s.endMemo || (s.startMemo ? s.startMemo : <span className="no-memo">なし</span>)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>前へ</button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>次へ</button>
                </div>
            )}

            {/* 編集モーダル */}
            {editingSession && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>メモを編集</h3>
                        <textarea
                            value={editEndMemo}
                            onChange={(e) => setEditEndMemo(e.target.value)}
                            rows={4}
                            placeholder="終了メモを入力"
                        />
                        <div className="modal-actions">
                            <button className="secondary" onClick={() => setEditingSession(null)}>キャンセル</button>
                            <button className="primary" onClick={handleUpdateMemo}>保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
