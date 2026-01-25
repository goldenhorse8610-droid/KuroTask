import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
    const { user, logout } = useAuth();

    const navItems = [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'tasks', label: 'Tasks', icon: '✓' },
        { id: 'recurring', label: 'Recurring', icon: '🔁' },
        { id: 'quick', label: 'Quick', icon: '💬' },
        { id: 'calendar', label: 'Calendar', icon: '📅' },
        { id: 'history', label: 'History', icon: '📊' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="layout">
            <nav className="sidebar">
                <div className="sidebar-header">
                    <h1 className="app-title">KuroTask</h1>
                    <p className="user-email">{user?.email}</p>
                </div>

                <ul className="nav-list">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                                onClick={() => onNavigate(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="sidebar-footer">
                    <button className="logout-button" onClick={logout}>
                        ログアウト
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
