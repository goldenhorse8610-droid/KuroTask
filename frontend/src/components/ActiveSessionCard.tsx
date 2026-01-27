import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
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
    const [tick, setTick] = useState(0);
    const [endMemo, setEndMemo] = useState('');
    const [stopping, setStopping] = useState(false);

    // 騾夂衍蛻ｶ蠕｡逕ｨ縺ｮRef
    const lastElapsedRemindMin = useRef<number>(0);
    const notifiedEnd = useRef<boolean>(false);

    useEffect(() => {
        // 10ms縺斐→縺ｫtick繧呈峩譁ｰ縺励※蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 10);

        return () => clearInterval(interval);
    }, [session.startAt]);

    // 騾夂衍繝ｭ繧ｸ繝・け
    useEffect(() => {
        if (!settings) return;

        const startTime = new Date(session.startAt).getTime();
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);

        // (T2) X蛻・ｵ碁℃騾夂衍
        if (settings.timerElapsedRemindMin > 0) {
            const remindInterval = settings.timerElapsedRemindMin;
            if (elapsedMin > 0 && elapsedMin % remindInterval === 0 && elapsedMin !== lastElapsedRemindMin.current) {
                // 騾夂衍螳溯｡・
                if (settings.timerElapsedRemindRepeat || lastElapsedRemindMin.current === 0) {
                    sendNotification(
                        `${session.task.name}: ${elapsedMin}蛻・ｵ碁℃`,
                        `險域ｸｬ繧帝幕蟋九＠縺ｦ縺九ｉ${elapsedMin}蛻・′邨碁℃縺励∪縺励◆縲Ａ
                    );
                    lastElapsedRemindMin.current = elapsedMin;
                }
            }
        }

        // (T3) 繧ｫ繧ｦ繝ｳ繝医ム繧ｦ繝ｳ邨ゆｺ・夂衍
        if (session.mode === 'countdown' && session.plannedDurationSec) {
            const remainingSec = Math.max(0, session.plannedDurationSec - elapsedSec);
            if (remainingSec === 0 && !notifiedEnd.current) {
                sendNotification(
                    `${session.task.name}: 繧ｿ繧､繝槭・邨ゆｺ・,
                    `險ｭ螳壹＠縺滓凾髢薙′邨碁℃縺励∪縺励◆縲ゅ♀逍ｲ繧梧ｧ倥〒縺励◆・～
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
                sub: `邨碁℃: ${time.hours}譎る俣${time.minutes}蛻・,
            };
        } else {
            // 繧ｫ繧ｦ繝ｳ繝医ム繧ｦ繝ｳ
            const plannedSec = session.plannedDurationSec || 0;
            const remainingSec = Math.max(0, plannedSec - time.elapsedSec);

            const hours = Math.floor(remainingSec / 3600);
            const minutes = Math.floor((remainingSec % 3600) / 60);
            const secs = remainingSec % 60;
            const startTime = new Date(session.startAt).getTime();
            const elapsedMs = Date.now() - startTime;
            const centisecs = Math.floor((plannedSec * 1000 - elapsedMs) % 1000 / 10);

            const remainingDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${Math.max(0, centisecs).toString().padStart(2, '0')}`;

            // 邨ゆｺ・凾蛻ｻ險育ｮ・
            const endTime = new Date(new Date(session.startAt).getTime() + plannedSec * 1000);
            const endHours = endTime.getHours().toString().padStart(2, '0');
            const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

            return {
                main: remainingDisplay,
                sub: `谿九ｊ${hours}譎る俣${minutes}蛻・(邨ゆｺ・凾蛻ｻ: ${endHours}:${endMinutes})`,
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
            alert('繧ｻ繝・す繝ｧ繝ｳ縺ｮ邨ゆｺ・↓螟ｱ謨励＠縺ｾ縺励◆');
        } finally {
            setStopping(false);
        }
    };

    const timeDisplay = getTimeDisplay();

    return (
        <div className={`active-session-card ${timeDisplay.isFinished ? 'finished' : ''}`}>
            <div className="session-header">
                <span className="session-mode">
                    {session.mode === 'stopwatch' ? '竢ｱ・・繧ｹ繝医ャ繝励え繧ｩ繝・メ' : '竢ｰ 繧ｿ繧､繝槭・'}
                </span>
            </div>

            <h2 className="task-name-large">{session.task.name}</h2>

            <div className="time-display">
                <div className="time-main">{timeDisplay.main}</div>
                <div className="time-sub">{timeDisplay.sub}</div>
            </div>

            {timeDisplay.isFinished && (
                <div className="finished-alert">
                    竢ｰ 繧ｿ繧､繝槭・邨ゆｺ・ｼ・
                </div>
            )}

            <div className="session-controls">
                <textarea
                    className="end-memo-input"
                    value={endMemo}
                    onChange={(e) => setEndMemo(e.target.value)}
                    placeholder="邨ゆｺ・Γ繝｢繧貞・蜉幢ｼ井ｻｻ諢擾ｼ・
                    rows={2}
                />
                <button
                    className="stop-button-large"
                    onClick={handleStop}
                    disabled={stopping}
                >
                    {stopping ? '邨ゆｺ・ｸｭ...' : '邨ゆｺ・}
                </button>
            </div>
        </div>
    );
}
