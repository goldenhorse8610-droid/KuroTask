import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { requestNotificationPermission } from '../utils/notifications';
import './Settings.css';


export default function Settings() {
    const { apiUrl } = useAuth();
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

            alert('クラウド同期が完亁E��ました');
            fetchSettings();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('同期に失敗しました。サーバ�Eが起動してぁE��か確認してください、E);
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
            alert('通知が許可されませんでした。ブラウザの設定を確認してください、E);
        }
    };

    if (loading) return <div className="settings-loading">読み込み中...</div>;

    return (
        <div className="settings-container">
            <h1 className="page-title">Settings</h1>

            <div className="settings-section">
                <h3>通知設宁E/h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">ブラウザ通知</span>
                            <p className="setting-description">タイマ�E終亁E��めE��過時間をお知らせしまぁE/p>
                        </div>
                        <div className="setting-action">
                            {permissionStatus === 'granted' ? (
                                <span className="status-tag success">許可済み ✁E/span>
                            ) : (
                                <button className="secondary sm" onClick={handleRequestPermission}>
                                    通知を許可する
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">経過時間の通知�E��E�E�E/span>
                            <p className="setting-description">計測中、指定した�E数が経過するた�Eに通知しまぁE/p>
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
                            <p className="setting-description">一度だけでなく、毎回通知しまぁE/p>
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
                <h3>放置監視設宁E/h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">放置しきぁE���E�日数�E�E/span>
                            <p className="setting-description">持E��した日数以上計測がなぁE��スクをHomeでリマインドしまぁE/p>
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
                <h3>起床�Eサイレント設宁E/h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">起床警告時閁E/span>
                            <p className="setting-description">こ�E時間を過ぎて起床記録すると警告を表示しまぁE/p>
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
                            <span className="setting-label">おやすみモード（開始！E/span>
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
                            <span className="setting-label">おやすみモード（終亁E��E/span>
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
                <h3>クラウド同朁E(方式①)</h3>
                <div className="settings-card">
                    <div className="setting-item">
                        <div className="setting-info">
                            <span className="setting-label">一括マ�Eジ実衁E/span>
                            <p className="setting-description">
                                スマ�Eでの記録をこのPCへ同期、また�EPCの記録をクラウドへ預けます、Ebr />
                                <small>※PCがスリープ中はスマ�Eから同期できません。PC起動時に一括でマ�Eジしてください、E/small>
                            </p>
                        </div>
                        <div className="setting-action">
                            <button
                                className={`primary ${syncLoading ? 'loading' : ''}`}
                                onClick={handleSync}
                                disabled={syncLoading}
                            >
                                {syncLoading ? '同期中...' : '最新の状態にする (1クリチE��同期)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-actions">
                <button className="primary lg" onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '設定を保孁E}
                </button>
            </div>
        </div>
    );
}
