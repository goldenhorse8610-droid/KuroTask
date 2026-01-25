import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval
} from 'date-fns';
import { ja } from 'date-fns/locale';
import * as holidayJp from '@holiday-jp/holiday_jp';
import { useAuth } from '../contexts/AuthContext';
import './Calendar.css';

interface CalendarEvent {
    id: string;
    type: 'session' | 'todo';
    title: string;
    duration?: number;
    time?: string;
}

export default function Calendar() {
    const { apiUrl } = useAuth();
    const [viewMode, setViewMode] = useState<'year' | 'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // タスク作成用 (Tasks.tsx と同じ)
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<'stopwatch' | 'timer' | 'checklist'>('stopwatch');
    const [formCategory, setFormCategory] = useState('');
    const [formMemo, setFormMemo] = useState('');
    const [formIdleMonitor, setFormIdleMonitor] = useState(false);
    const [formDefaultDuration, setFormDefaultDuration] = useState('');
    const [showNewCategory, setShowNewCategory] = useState(false);

    useEffect(() => {
        fetchEvents();
        fetchMetadata();
    }, [currentDate, viewMode]);

    const fetchMetadata = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const cats = Array.from(new Set(res.data.tasks.map((t: any) => t.category).filter(Boolean))) as string[];
            setCategories(cats);
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    };

    const fetchEvents = async () => {
        const token = localStorage.getItem('token');
        // 取得範囲を決める
        let monthStr = format(currentDate, 'yyyy-MM');
        // 年表示の場合はその年の全データを取得したいが、APIは月単位なので表示月に合わせる
        // 本来は範囲指定APIにすべきだが、一旦現在の月ベース
        setLoading(true);
        try {
            const res = await axios.get(`${apiUrl}/calendar/events?month=${monthStr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(res.data.events);
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || !selectedDate) return;
        const token = localStorage.getItem('token');

        const data = {
            name: formName,
            type: formType,
            category: formCategory || null,
            memo: formMemo || null,
            idleMonitorEnabled: formType !== 'checklist' ? formIdleMonitor : false,
            defaultTimerDurationSec: formType === 'timer' && formDefaultDuration
                ? parseInt(formDefaultDuration) * 60
                : null,
            plannedDate: selectedDate.toISOString(), // 選択された日付を予定日に設定
        };

        try {
            await axios.post(`${apiUrl}/tasks`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            resetForm();
            setShowAddModal(false);
            fetchEvents();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('タスクの作成に失敗しました');
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormType('stopwatch');
        setFormCategory('');
        setFormMemo('');
        setFormIdleMonitor(false);
        setFormDefaultDuration('');
        setShowNewCategory(false);
    };

    const renderHeader = () => {
        return (
            <div className="calendar-header">
                <div className="header-left">
                    <div className="month-display">
                        <h2>{
                            viewMode === 'year' ? format(currentDate, 'yyyy年', { locale: ja }) :
                                viewMode === 'day' ? format(currentDate, 'yyyy年 M月 d日 (E)', { locale: ja }) :
                                    format(currentDate, 'yyyy年 M月', { locale: ja })
                        }</h2>
                    </div>
                </div>

                <div className="header-right">
                    <div className="view-switcher button-group">
                        {(['year', 'month', 'week', 'day'] as const).map(m => (
                            <button
                                key={m}
                                className={viewMode === m ? 'active' : ''}
                                onClick={() => setViewMode(m)}
                            >
                                {m === 'year' ? '年' : m === 'month' ? '月' : m === 'week' ? '週' : '日'}
                            </button>
                        ))}
                    </div>
                    <div className="calendar-nav">
                        <button onClick={() => {
                            if (viewMode === 'year') setCurrentDate(subYear(currentDate, 1));
                            else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
                            else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
                            else setCurrentDate(subMonths(currentDate, 1));
                        }}>&lt;</button>
                        <button onClick={() => setCurrentDate(new Date())}>今日</button>
                        <button onClick={() => {
                            if (viewMode === 'year') setCurrentDate(addYear(currentDate, 1));
                            else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
                            else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
                            else setCurrentDate(addMonths(currentDate, 1));
                        }}>&gt;</button>
                    </div>
                </div>
            </div>
        );
    };

    const subYear = (d: Date, n: number) => { const nd = new Date(d); nd.setFullYear(d.getFullYear() - n); return nd; };
    const addYear = (d: Date, n: number) => { const nd = new Date(d); nd.setFullYear(d.getFullYear() + n); return nd; };
    const subDays = (d: Date, n: number) => { const nd = new Date(d); nd.setDate(d.getDate() - n); return nd; };

    const renderDaysHeader = () => {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return (
            <div className="calendar-days-header">
                {days.map((day, i) => (
                    <div key={i} className={`day-name ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
        const rows: any[] = [];
        let days: any[] = [];

        calendarDays.forEach((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events[dateStr] || [];
            const isHoliday = holidayJp.isHoliday(day);
            const holidayName = isHoliday ? holidayJp.between(day, day)[0].name : '';

            days.push(
                <div
                    key={dateStr}
                    className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' :
                        isSameDay(day, new Date()) ? 'today' : ''
                        } ${isHoliday ? 'holiday' : ''}`}
                    onClick={() => {
                        setSelectedDate(day);
                        setShowAddModal(true);
                    }}
                >
                    <div className="cell-header">
                        <span className="day-number">{format(day, 'd')}</span>
                        {isHoliday && <span className="holiday-label">{holidayName}</span>}
                    </div>
                    <div className="cell-events">
                        {dayEvents.map((ev, idx) => (
                            <div key={idx} className={`calendar-event-pill ${ev.type}`} title={ev.title}>
                                {ev.type === 'session' ? <span className="ev-time">{ev.time}</span> : <span className="ev-icon">予定</span>}
                                <span className="ev-title">{ev.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

            if ((i + 1) % 7 === 0) {
                rows.push(<div key={i} className="calendar-row">{days}</div>);
                days = [];
            }
        });

        return (
            <>
                {renderDaysHeader()}
                <div className="calendar-body">{rows}</div>
            </>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate);
        const endDate = endOfWeek(currentDate);
        const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="calendar-week-view">
                {renderDaysHeader()}
                <div className="calendar-row">
                    {daysInterval.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = events[dateStr] || [];
                        return (
                            <div
                                key={dateStr}
                                className={`calendar-cell ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                onClick={() => { setSelectedDate(day); setShowAddModal(true); }}
                            >
                                <div className="cell-header">
                                    <span className="day-number">{format(day, 'd')}</span>
                                </div>
                                <div className="cell-events">
                                    {dayEvents.map((ev, idx) => (
                                        <div key={idx} className={`calendar-event-pill ${ev.type} large`}>
                                            <div className="ev-top">
                                                {ev.type === 'session' ? <span className="ev-time">{ev.time}</span> : <span className="ev-tag">予定</span>}
                                                <span className="ev-title">{ev.title}</span>
                                            </div>
                                            {ev.duration && <div className="ev-duration">{Math.round(ev.duration / 60)}分</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayEvents = events[dateStr] || [];

        return (
            <div className="calendar-day-view">
                <div className="day-view-content">
                    <div className="day-view-header">
                        <h3>アクティビティ一覧</h3>
                        <button className="primary small" onClick={() => { setSelectedDate(currentDate); setShowAddModal(true); }}>
                            ＋ タスク追加
                        </button>
                    </div>
                    <div className="day-events-list">
                        {dayEvents.length === 0 ? (
                            <div className="empty-day">この日の記録はありません</div>
                        ) : (
                            dayEvents.map((ev, idx) => (
                                <div key={idx} className={`day-event-item ${ev.type}`}>
                                    <div className="event-info">
                                        <span className="event-type-badge">{ev.type === 'session' ? '実績' : '予定'}</span>
                                        <span className="event-time">{ev.time || '--:--'}</span>
                                        <span className="event-title">{ev.title}</span>
                                    </div>
                                    {ev.duration && <span className="event-duration">{Math.round(ev.duration / 60)}分</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderYearView = () => {
        const months = [];
        for (let i = 0; i < 12; i++) {
            const m = new Date(currentDate.getFullYear(), i, 1);
            months.push(m);
        }

        return (
            <div className="calendar-year-grid">
                {months.map((m, idx) => (
                    <div key={idx} className="year-month-box card" onClick={() => { setCurrentDate(m); setViewMode('month'); }}>
                        <h4>{format(m, 'M月')}</h4>
                        <div className="mini-calendar">
                            {/* 簡易ドット表示などは将来的に */}
                            <div className="month-stat">{events[format(m, 'yyyy-MM-01')] ? 'データあり' : ''}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="calendar-container">
            <h1 className="page-title">Calendar</h1>

            <div className={`calendar-view-mode-${viewMode}`}>
                <div className="calendar-card card">
                    {renderHeader()}
                    {loading ? (
                        <div className="calendar-loading">読み込み中...</div>
                    ) : (
                        viewMode === 'year' ? renderYearView() :
                            viewMode === 'week' ? renderWeekView() :
                                viewMode === 'day' ? renderDayView() :
                                    renderMonthView()
                    )}
                </div>
            </div>

            {/* タスク追加モーダル (Tasks.tsx と共通のフル機能) */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{format(selectedDate!, 'M月d日')} のタスク追加</h2>
                        <form onSubmit={handleAddTask}>
                            <div className="form-group">
                                <label>タスク名 *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="タスクの名前"
                                />
                            </div>

                            <div className="form-group">
                                <label>種別 *</label>
                                <select value={formType} onChange={(e) => setFormType(e.target.value as any)}>
                                    <option value="stopwatch">ストップウォッチ計測</option>
                                    <option value="timer">タイマー計測</option>
                                    <option value="checklist">チェックリスト</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>カテゴリ</label>
                                {!showNewCategory && categories.length > 0 ? (
                                    <div className="category-selector">
                                        <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                                            <option value="">カテゴリなし</option>
                                            {categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="new-category-btn" onClick={() => setShowNewCategory(true)}>
                                            ＋新規
                                        </button>
                                    </div>
                                ) : (
                                    <div className="category-input">
                                        <input
                                            type="text"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            placeholder="新しいカテゴリ名"
                                        />
                                        {categories.length > 0 && (
                                            <button type="button" className="cancel-new-btn" onClick={() => setShowNewCategory(false)}>
                                                既存から選択
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>メモ</label>
                                <textarea
                                    value={formMemo}
                                    onChange={(e) => setFormMemo(e.target.value)}
                                    placeholder="詳細や目的"
                                    rows={3}
                                />
                            </div>

                            {formType !== 'checklist' && (
                                <>
                                    <div className="form-group checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formIdleMonitor}
                                                onChange={(e) => setFormIdleMonitor(e.target.checked)}
                                            />
                                            放置監視を有効化
                                        </label>
                                    </div>

                                    {formType === 'timer' && (
                                        <div className="form-group">
                                            <label>デフォルトタイマー時間（分）</label>
                                            <input
                                                type="number"
                                                value={formDefaultDuration}
                                                onChange={(e) => setFormDefaultDuration(e.target.value)}
                                                placeholder="25"
                                                min="1"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="secondary" onClick={() => setShowAddModal(false)}>
                                    キャンセル
                                </button>
                                <button type="submit" className="primary">
                                    作成
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
