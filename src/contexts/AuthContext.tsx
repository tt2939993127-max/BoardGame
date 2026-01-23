import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AUTH_API_URL } from '../config/server';
import i18n from '../lib/i18n';

interface User {
    id: string;
    username: string;
    email?: string;
    emailVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
    sendEmailCode: (email: string) => Promise<void>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 从 localStorage 加载 token
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '登录失败');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
    };

    const register = async (username: string, password: string) => {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '注册失败');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    const sendEmailCode = async (email: string) => {
        if (!token) throw new Error('请先登录');

        const response = await fetch(`${AUTH_API_URL}/send-email-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '发送验证码失败');
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        if (!token) throw new Error('请先登录');

        const response = await fetch(`${AUTH_API_URL}/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ email, code }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '验证失败');
        }

        const data = await response.json();
        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, sendEmailCode, verifyEmail, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必须在 AuthProvider 内使用');
    }
    return context;
}
