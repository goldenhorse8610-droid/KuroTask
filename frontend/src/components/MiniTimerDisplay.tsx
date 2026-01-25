import { useState, useEffect } from 'react';

interface MiniTimerDisplayProps {
    startAt: string;
    mode: string;
    plannedDurationSec: number | null;
}

export default function MiniTimerDisplay({ startAt, mode, plannedDurationSec }: MiniTimerDisplayProps) {
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 100); // 100msごとに更新

        return () => clearInterval(interval);
    }, []);

    const getDisplay = () => {
        const startTime = new Date(startAt).getTime();
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

        if (mode === 'stopwatch') {
            const hours = Math.floor(elapsedSec / 3600);
            const minutes = Math.floor((elapsedSec % 3600) / 60);
            const secs = elapsedSec % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            // カウントダウン
            const remainingSec = Math.max(0, (plannedDurationSec || 0) - elapsedSec);
            const hours = Math.floor(remainingSec / 3600);
            const minutes = Math.floor((remainingSec % 3600) / 60);
            const secs = remainingSec % 60;
            return `残り ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    };

    return (
        <div className="mini-timer">
            <span className="mini-timer-icon">▶</span>
            <span className="mini-timer-time">{getDisplay()}</span>
        </div>
    );
}
