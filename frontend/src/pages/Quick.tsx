import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Quick.css';

interface Message {
    id: string;
    role: 'user' | 'system';
    content: string;
    createdAt: string;
}

export default function Quick() {
    const { apiUrl } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    // サジェスト関連
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState(-1);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMessages();
        fetchCategories();
    }, []);

    useEffect(() => {
        // メッセージ追加時に最下部へスクロール
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/quick`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const fetchCategories = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const cats = Array.from(new Set(res.data.tasks.map((t: any) => t.category).filter(Boolean))) as string[];
            setCategories(cats);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart || 0;
        setInput(value);

        // @ の検知
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const query = textBeforeCursor.substring(lastAtIndex + 1);
            // スペースが含まれたらサジェスト終了
            if (!query.includes(' ')) {
                const filtered = categories.filter(c => c.toLowerCase().includes(query.toLowerCase()));
                setFilteredSuggestions(filtered);
                setMentionStart(lastAtIndex);
                setShowSuggestions(filtered.length > 0);
                setSuggestionIndex(0);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev + 1) % filteredSuggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectSuggestion(filteredSuggestions[suggestionIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
    };

    const selectSuggestion = (cat: string) => {
        const textBefore = input.substring(0, mentionStart);
        const textAfter = input.substring(inputRef.current?.selectionStart || 0);
        setInput(`${textBefore}@${cat}${textAfter}`);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const token = localStorage.getItem('token');
        const userText = input;
        setInput('');
        setShowSuggestions(false);
        setLoading(true);

        try {
            const res = await axios.post(`${apiUrl}/quick`, { content: userText }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessages(prev => [...prev, res.data.userMessage, res.data.systemMessage]);
            // カテゴリが増えた可能性があるので更新
            fetchCategories();
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: 'エラーが発生しました。再試行してください。',
                createdAt: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="quick-container">
            <h1 className="page-title">Quick</h1>

            <div className="chat-window" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <div className="welcome-icon">💬</div>
                        <h3>KuroTask Quick</h3>
                        <p>タスクを入力して送信するだけで、即座に追加されます。</p>
                        <p className="hint">例: 数学の宿題 @学習</p>
                        <p className="hint">@ を打つとカテゴリのサジェストが出ます。</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.role}`}>
                            <div className="message-header">
                                <span className="message-role">{msg.role === 'user' ? 'あなた' : 'KuroBot'}</span>
                                <span className="message-time">{formatTime(msg.createdAt)}</span>
                            </div>
                            <div className="message-body">
                                {msg.content.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="chat-message system loading">
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                {showSuggestions && (
                    <div className="suggestion-popover">
                        {filteredSuggestions.map((cat, i) => (
                            <div
                                key={cat}
                                className={`suggestion-item ${i === suggestionIndex ? 'active' : ''}`}
                                onClick={() => selectSuggestion(cat)}
                            >
                                <span className="suggestion-prefix">@</span>
                                <span className="suggestion-label">{cat}</span>
                            </div>
                        ))}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="タスクを入力... (@でカテゴリ指定)"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                />
                <button type="submit" className="send-button" disabled={!input.trim() || loading}>
                    送信
                </button>
            </form>
        </div>
    );
}
