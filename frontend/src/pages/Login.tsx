import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';


export default function Login() {
    const { login, apiUrl, updateApiUrl } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tempUrl, setTempUrl] = useState(apiUrl);
    const [showSettings, setShowSettings] = useState(false);

    const handleRequestLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // 接続先を確定
        updateApiUrl(tempUrl);

        try {
            const response = await axios.post(`${tempUrl}/auth/request-link`, { email });
            // Backend now returns token directly
            if (response.data.token) {
                await login(response.data.token);
            } else {
                setError('Login failed - no token received');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="login-container">
            <div className="login-card">
                <h1>KuroTask</h1>
                <p className="subtitle">誘惑に負けないタスク管理</p>

                <form onSubmit={handleRequestLink}>
                    <div className="form-group">
                        <label>メールアドレス</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            disabled={loading}
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" disabled={loading}>
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>

                <div className="login-extra">
                    <button className="text-btn" onClick={() => setShowSettings(!showSettings)}>
                        {showSettings ? '▲ 接続設定を閉じる' : '▼ 別のサーバーに接続する'}
                    </button>
                    {showSettings && (
                        <div className="server-settings">
                            <label>API サーバー URL</label>
                            <input
                                type="text"
                                value={tempUrl}
                                onChange={(e) => setTempUrl(e.target.value)}
                                placeholder="http://192.168.1.18:3000"
                            />
                            <p className="hint">外部からアクセスする場合は、トンネルURLを入力してください</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
