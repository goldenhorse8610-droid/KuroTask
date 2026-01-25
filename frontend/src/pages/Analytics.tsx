import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import './Analytics.css';

const API_BASE = `http://${window.location.hostname}:3000`;
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Analytics() {
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 設定ステート
    const [period, setPeriod] = useState('week');
    const [unit, setUnit] = useState('minutes');
    const [selectedTaskId, setSelectedTaskId] = useState('all');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');

    // 選択肢用
    const [tasks, setTasks] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchData();
    }, [period, selectedTaskId, selectedCategoryId]);

    const fetchMetadata = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_BASE}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.tasks);
            const cats = Array.from(new Set(res.data.tasks.map((t: any) => t.category).filter(Boolean))) as string[];
            setCategories(cats);
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    };

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', period);
            if (selectedTaskId !== 'all') params.append('taskId', selectedTaskId);
            if (selectedCategoryId !== 'all') params.append('categoryId', selectedCategoryId);

            const res = await axios.get(`${API_BASE}/analytics/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChartData(res.data.chartData);
        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const convertValue = (seconds: number) => {
        switch (unit) {
            case 'seconds': return seconds;
            case 'minutes': return Math.round(seconds / 60);
            case 'hours': return parseFloat((seconds / 3600).toFixed(1));
            case 'days': return parseFloat((seconds / 86400).toFixed(2));
            default: return Math.round(seconds / 60);
        }
    };

    const unitLabel = {
        seconds: '秒',
        minutes: '分',
        hours: '時間',
        days: '日'
    }[unit];

    const displayData = chartData.map(d => ({
        ...d,
        value: convertValue(d.seconds)
    }));

    return (
        <div className="analytics-container">
            <h1 className="page-title">Analytics</h1>

            <div className="analytics-controls card">
                <div className="control-group">
                    <label>期間</label>
                    <div className="button-group">
                        {['day', 'week', 'month', 'year'].map(p => (
                            <button
                                key={p}
                                className={period === p ? 'active' : ''}
                                onClick={() => setPeriod(p)}
                            >
                                {p === 'day' ? '今日' : p === 'week' ? '週間' : p === 'month' ? '月間' : '年間'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>単位</label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                        <option value="seconds">秒</option>
                        <option value="minutes">分</option>
                        <option value="hours">時間</option>
                        <option value="days">日</option>
                    </select>
                </div>

                <div className="control-group">
                    <label>カテゴリ</label>
                    <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                        <option value="all">すべて</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="control-group">
                    <label>タスク</label>
                    <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
                        <option value="all">すべて</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="analytics-main-chart card">
                <h3>活動アクティビティ ({unitLabel})</h3>
                {loading ? (
                    <div className="chart-loading">読み込み中...</div>
                ) : displayData.length === 0 ? (
                    <div className="empty-chart">データがありません</div>
                ) : (
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={displayData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="label" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#F3F4F6' }}
                                />
                                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="stats-summary-grid">
                <div className="stat-summary-card card">
                    <span className="stat-label">期間中の総計</span>
                    <span className="stat-value">
                        {convertValue(chartData.reduce((acc, cur) => acc + cur.seconds, 0))} {unitLabel}
                    </span>
                </div>
                <div className="stat-summary-card card">
                    <span className="stat-label">ラベルあたりの平均</span>
                    <span className="stat-value">
                        {chartData.length > 0
                            ? convertValue(Math.round(chartData.reduce((acc, cur) => acc + cur.seconds, 0) / chartData.length))
                            : 0} {unitLabel}
                    </span>
                </div>
            </div>
        </div>
    );
}
