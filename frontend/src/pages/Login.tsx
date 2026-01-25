import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';


export default function Login() {
    const { login, apiUrl, updateApiUrl } = useAuth();
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
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
            setMessage(response.data.message);
            setStep('code');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${tempUrl}/auth/verify`, { code });
            await login(response.data.token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>KuroTask</h1>
                <p className="subtitle">誘惑に負けないタスク管理</p>

                {step === 'email' ? (
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
                            {loading ? '送信中...' : 'ログインコードを送信'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify}>
                        <div className="info-message">{message}</div>
                        <div className="form-group">
                            <label>認証コード</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="6桁のコード"
                                maxLength={6}
                                required
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" disabled={loading}>
                            {loading ? '確認中...' : 'ログイン'}
                        </button>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => { setStep('email'); setCode(''); setError(''); }}
                        >
                            戻る
                        </button>
                    </form>
                )}

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
