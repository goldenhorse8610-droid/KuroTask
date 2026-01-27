import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { sendNotification } from '../utils/notifications';
import './ActiveSessionCard.css';

interface Session {
    id: string;
    mode: string;
    plannedDurationSec: number | null;
    startAt: string;
    task: {
        id: string;
        name: string;
    };
}

interface ActiveSessionCardProps {
    session: Session;
    settings: any;
    onStop: () => void;
}

export default function ActiveSessionCard({ session, settings, onStop }: ActiveSessionCardProps) {
    const { apiUrl } = useAuth();
    const [tick, setTick] = useState(0);
    const [endMemo, setEndMemo] = useState('');
    const [stopping, setStopping] = useState(false);

    // 通知制御用のRef
    const lastElapsedRemindMin = useRef<number>(0);
    const notifiedEnd = useRef<boolean>(false);

    useEffect(() => {
        // 10msごとにtickを更新して再レンダリング
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 10);

        return () => clearInterval(interval);
    }, [session.startAt]);

    // 通知ロジック
    useEffect(() => {
        if (!settings) return;

        const startTime = new Date(session.startAt).getTime();
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);

        // (T2) X分経過通知
        if (settings.timerElapsedRemindMin > 0) {
            const remindInterval = settings.timerElapsedRemindMin;
            if (elapsedMin > 0 && elapsedMin % remindInterval === 0 && elapsedMin !== lastElapsedRemindMin.current) {
                // 通知実行
                if (settings.timerElapsedRemindRepeat || lastElapsedRemindMin.current === 0) {
                    sendNotification(
                        `${session.task.name}: ${elapsedMin}分経過`,
                        `計測を開始してから${elapsedMin}分が経過しました。`
                    );
                    lastElapsedRemindMin.current = elapsedMin;
                }
            }
        }

        // (T3) カウントダウン終了通知
        if (session.mode === 'countdown' && session.plannedDurationSec) {
            const remainingSec = Math.max(0, session.plannedDurationSec - elapsedSec);
            if (remainingSec === 0 && !notifiedEnd.current) {
                sendNotification(
                    `${session.task.name}: タイマー終了`,
                    `設定した時間が経過しました。お疲れ様でした！`
                );
                notifiedEnd.current = true;
            }
        }
    }, [tick, session, settings]);

    const formatTime = () => {
        const startTime = new Date(session.startAt).getTime();
        const elapsedMs = Date.now() - startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);

        const hours = Math.floor(elapsedSec / 3600);
        const minutes = Math.floor((elapsedSec % 3600) / 60);
        const secs = elapsedSec % 60;
        const centisecs = Math.floor((elapsedMs % 1000) / 10);

        return {
            display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`,
            hours,
            minutes,
            secs,
            elapsedSec,
        };
    };

    const getTimeDisplay = () => {
        const time = formatTime();

        if (session.mode === 'stopwatch') {
            return {
                main: time.display,
                sub: `経過: ${time.hours}時間${time.minutes}分`,
            };
        } else {
            // カウントダウン
            const plannedSec = session.plannedDurationSec || 0;
            const remainingSec = Math.max(0, plannedSec - time.elapsedSec);

            const hours = Math.floor(remainingSec / 3600);
            const minutes = Math.floor((remainingSec % 3600) / 60);
            const secs = remainingSec % 60;
            const startTime = new Date(session.startAt).getTime();
            const elapsedMs = Date.now() - startTime;
            const centisecs = Math.floor((plannedSec * 1000 - elapsedMs) % 1000 / 10);

            const remainingDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${Math.max(0, centisecs).toString().padStart(2, '0')}`;

            // 終了時刻計算
            const endTime = new Date(new Date(session.startAt).getTime() + plannedSec * 1000);
            const endHours = endTime.getHours().toString().padStart(2, '0');
            const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

            return {
                main: remainingDisplay,
                sub: `残り${hours}時間${minutes}分 (終了時刻: ${endHours}:${endMinutes})`,
                isFinished: remainingSec === 0,
            };
        }
    };

    const handleStop = async () => {
        setStopping(true);
        const token = localStorage.getItem('token');

        try {
            await axios.post(`${apiUrl}/timer/stop`, {
                endMemo: endMemo || null,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onStop();
        } catch (error) {
            console.error('Failed to stop session:', error);
            alert('セッションの終了に失敗しました');
        } finally {
            setStopping(false);
        }
    };

    const timeDisplay = getTimeDisplay();

    return (
        <div className={`active-session-card ${timeDisplay.isFinished ? 'finished' : ''}`}>
            <div className="session-header">
                <span className="session-mode">
                    {session.mode === 'stopwatch' ? '⏱️ ストップウォッチ' : '⏰ タイマー'}
                </span>
            </div>

            <h2 className="task-name-large">{session.task.name}</h2>

            <div className="time-display">
                <div className="time-main">{timeDisplay.main}</div>
                <div className="time-sub">{timeDisplay.sub}</div>
            </div>

            {timeDisplay.isFinished && (
                <div className="finished-alert">
                    ⏰ タイマー終了！
                </div>
            )}

            <div className="session-controls">
                <textarea
                    className="end-memo-input"
                    value={endMemo}
                    onChange={(e) => setEndMemo(e.target.value)}
                    placeholder="終了メモを入力（任意）"
                    rows={2}
                />
                <button
                    className="stop-button-large"
                    onClick={handleStop}
                    disabled={stopping}
                >
                    {stopping ? '終了中...' : '終了'}
                </button>
            </div>
        </div>
    );
}
