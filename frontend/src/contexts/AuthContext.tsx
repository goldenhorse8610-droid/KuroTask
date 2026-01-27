import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
    id: string;
    email: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    apiUrl: string;
    updateApiUrl: (url: string) => void;
    login: (token: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiUrl, setApiUrl] = useState(() => {
        const saved = localStorage.getItem('kurotask_api_url');
        if (saved) return saved;

        // Auto-detect environment
        const hostname = window.location.hostname;
        if (hostname === 'kuro-task-wcmu.vercel.app' || hostname.includes('vercel.app')) {
            return 'https://kurotask.onrender.com';
        }
        return `http://${hostname}:3000`;
    });

    const updateApiUrl = (newUrl: string) => {
        setApiUrl(newUrl);
        localStorage.setItem('kurotask_api_url', newUrl);
    };


    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${apiUrl}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (token: string) => {
        localStorage.setItem('token', token);
        await checkAuth();
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, apiUrl, updateApiUrl, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
