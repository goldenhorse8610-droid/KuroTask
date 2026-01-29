import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission } from '../utils/notifications';
import './Settings.css';

export default function Settings() {
    const { apiUrl, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    const [settings, setSettings] = useState({
        wakeWarningTime: '10:00',
        timerElapsedRemindMin: 5,
        timerElapsedRemindRepeat: false,
        silentHoursStart: '22:00',
        silentHoursEnd: '07:00',
        idleThresholdDays: 7
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.settings) {
                setSettings({
                    wakeWarningTime: res.data.settings.wakeWarningTime || '10:00',
                    timerElapsedRemindMin: res.data.settings.timerElapsedRemindMin || 5,
                    timerElapsedRemindRepeat: res.data.settings.timerElapsedRemindRepeat || false,
                    silentHoursStart: res.data.settings.silentHoursStart || '22:00',
                    silentHoursEnd: res.data.settings.silentHoursEnd || '07:00',
                    idleThresholdDays: res.data.settings.idleThresholdDays || 7
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            await axios.patch(`${apiUrl}/settings`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('設定を保存しました');
        } catch (error) {
            console.error('Failed to update settings:', error);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const [syncLoading, setSyncLoading] = useState(false);

    const handleSync = async () => {
        setSyncLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [tasksRes, sessionsRes, wakeRes] = await Promise.all([
                axios.get(`${apiUrl}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/timer/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/wake/history`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            await axios.post(`${apiUrl}/sync/push`, {
                tasks: tasksRes.data.tasks,
                sessions: sessionsRes.data.sessions || [],
                wakeLogs: wakeRes.data.history || []
            }, { headers: { Authorization: `Bearer ${token}` } });

            await axios.get(`${apiUrl}/sync/pull`, { headers: { Authorization: `Bearer ${token}` } });

            alert('クラウド同期が完了しました');
            fetchSettings();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('同期に失敗しました。サーバーが起動しているか確認してください。');
        } finally {
            setSyncLoading(false);
        }
    };

    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setPermissionStatus(Notification.permission);
        if (granted) {
            alert('通知が許可されました');
        } else {
            alert('通知が許可されませんでした。ブラウザの設定を確認してください。');
        }
    };

    if (loading) return <div className="settings-loading">読み込み中...</div>;

    return (
        <div className="settings-container">
            <h1 className="page-title">Settings</h1>

            <div className="settings-section">
                <h3>通知設定</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">ブラウザ通知</span>
                            <p className="setting-description">タイマー終了時や経過時間をお知らせします</p>
                        </div>
                        <div className="setting-action">
                            {permissionStatus === 'granted' ? (
                                <span className="status-tag success">許可済み ✓</span>
                            ) : (
                                <button className="secondary sm" onClick={handleRequestPermission}>
                                    通知を許可する
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">経過時間の通知（分）</span>
                            <p className="setting-description">計測中、指定した分数が経過するたびに通知します</p>
                        </div>
                        <div className="setting-action">
                            <input
                                type="number"
                                value={settings.timerElapsedRemindMin}
                                onChange={(e) => setSettings({ ...settings, timerElapsedRemindMin: parseInt(e.target.value) })}
                                min="1"
                                max="60"
                            />
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">通知を繰り返す</span>
                            <p className="setting-description">一度だけでなく、毎回通知します</p>
                        </div>
                        <div className="setting-action">
                            <input
                                type="checkbox"
                                checked={settings.timerElapsedRemindRepeat}
                                onChange={(e) => setSettings({ ...settings, timerElapsedRemindRepeat: e.target.checked })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>放置監視設定</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">放置しきい値（日数）</span>
                            <p className="setting-description">指定した日数以上計測がないタスクをHomeでリマインドします</p>
                        </div>
                        <div className="setting-action">
                            <input
                                type="number"
                                value={settings.idleThresholdDays}
                                onChange={(e) => setSettings({ ...settings, idleThresholdDays: parseInt(e.target.value) })}
                                min="1"
                                max="30"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>起床・サイレント設定</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">起床警告時間</span>
                            <p className="setting-description">この時間を過ぎて起床記録すると警告を表示します</p>
                        </div>
                        <div className="setting-action">
                            <input
                                type="time"
                                value={settings.wakeWarningTime}
                                onChange={(e) => setSettings({ ...settings, wakeWarningTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">おやすみモード（開始）</span>
                        </div>
                        <div className="setting-action">
                            <input
                                type="time"
                                value={settings.silentHoursStart}
                                onChange={(e) => setSettings({ ...settings, silentHoursStart: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">おやすみモード（終了）</span>
                        </div>
                        <div className="setting-action">
                            <input
                                type="time"
                                value={settings.silentHoursEnd}
                                onChange={(e) => setSettings({ ...settings, silentHoursEnd: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>Googleカレンダー連携 (iCalendar)</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">カレンダーフィードURL</span>
                            <p className="setting-description">
                                このURLをGoogleカレンダーの「URLで追加」に登録すると、予定タスクが表示されます。<br />
                                <small>※このURLは誰にも教えないでください。外部から予定が見えるようになります。</small>
                            </p>
                        </div>
                        <div className="setting-action-block">
                            <div className="url-copy-box">
                                <input
                                    type="text"
                                    readOnly
                                    value={user?.calendarToken ? `${apiUrl}/calendar-feed/feed/${user.calendarToken}.ics` : '発行中...'}
                                />
                                <button
                                    className="secondary sm"
                                    onClick={() => {
                                        const url = `${apiUrl}/calendar-feed/feed/${user?.calendarToken}.ics`;
                                        navigator.clipboard.writeText(url);
                                        alert('URLをコピーしました');
                                    }}
                                >
                                    コピー
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>クラウド同期 (方式①)</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">一括マージ実行</span>
                            <p className="setting-description">
                                スマホでの記録をこのPCへ同期、またはPCの記録をクラウドへ預けます。<br />
                                <small>※PCがスリープ中はスマホから同期できません。PC起動時に一括でマージしてください。</small>
                            </p>
                        </div>
                        <div className="setting-action">
                            <button
                                className={`primary ${syncLoading ? 'loading' : ''}`}
                                onClick={handleSync}
                                disabled={syncLoading}
                            >
                                {syncLoading ? '同期中...' : '最新の状態にする (1クリック同期)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-actions">
                <button className="primary lg" onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '設定を保存'}
                </button>
            </div>
        </div>
    );
}
