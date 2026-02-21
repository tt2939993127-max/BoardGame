import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { AUTH_API_URL } from '../config/server';
import i18n from '../lib/i18n';

interface User {
    id: string;
    username: string;
    email?: string;
    emailVerified?: boolean;
    lastOnline?: string;
    avatar?: string;
    role: 'user' | 'admin';
    banned: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    // account: 邮箱
    login: (email: string, password: string) => Promise<void>;
    register: (username: string, email: string, code: string, password: string) => Promise<void>;
    sendRegisterCode: (email: string) => Promise<void>;
    sendResetCode: (email: string) => Promise<void>;
    resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
    logout: () => void;
    sendEmailCode: (email: string) => Promise<void>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateUsername: (username: string) => Promise<User>;
    updateAvatar: (avatar: string) => Promise<User>;
    uploadAvatar: (file: File, cropData?: { x: number; y: number; width: number; height: number }) => Promise<User>;
    isLoading: boolean;
}

// 创建一个默认的 noop 实现，避免在 Provider 外部使用时崩溃
const defaultAuthContext: AuthContextType = {
    user: null,
    token: null,
    login: async () => { throw new Error('AuthProvider 未初始化'); },
    register: async () => { throw new Error('AuthProvider 未初始化'); },
    sendRegisterCode: async () => { throw new Error('AuthProvider 未初始化'); },
    sendResetCode: async () => { throw new Error('AuthProvider 未初始化'); },
    resetPassword: async () => { throw new Error('AuthProvider 未初始化'); },
    logout: () => { throw new Error('AuthProvider 未初始化'); },
    sendEmailCode: async () => { throw new Error('AuthProvider 未初始化'); },
    verifyEmail: async () => { throw new Error('AuthProvider 未初始化'); },
    changePassword: async () => { throw new Error('AuthProvider 未初始化'); },
    updateUsername: async () => { throw new Error('AuthProvider 未初始化'); },
    updateAvatar: async () => { throw new Error('AuthProvider 未初始化'); },
    uploadAvatar: async () => { throw new Error('AuthProvider 未初始化'); },
    isLoading: true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

const parseErrorMessage = async (response: Response, fallback: string) => {
    let text = '';
    try {
        text = await response.text();
    } catch {
        return fallback;
    }

    if (!text) {
        return fallback;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        return fallback;
    }

    try {
        const data = JSON.parse(text) as { error?: string; message?: string };
        return data.error || data.message || fallback;
    } catch {
        return fallback;
    }
};


export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 从 localStorage 加载 token
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser) as User;
                setToken(savedToken);
                setUser(parsedUser);
            } catch {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
        setIsLoading(false);
    }, []);

    // 联动监控服务：标识用户信息（Sentry 异步加载，不阻塞首屏）
    useEffect(() => {
        void import('@sentry/react').then((Sentry) => {
            if (user) {
                Sentry.setUser({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                });
            } else {
                Sentry.setUser(null);
            }
        });
    }, [user]);

    const login = useCallback(async (email: string, password: string) => {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ account: email, password }),
        });

        const payload = await response.json().catch(() => null) as null | {
            success: boolean;
            message?: string;
            code?: string;
            data?: { token?: string; user?: User; suggestRegister?: boolean };
        };

        if (!response.ok || !payload) {
            throw new Error('登录失败');
        }

        if (!payload.success) {
            const error = new Error(payload.message || '登录失败') as Error & { code?: string; suggestRegister?: boolean };
            error.code = payload.code;
            error.suggestRegister = payload.data?.suggestRegister;
            throw error;
        }

        const token = payload.data?.token ?? '';
        const user = payload.data?.user ?? null;
        if (!token || !user) {
            throw new Error('登录响应异常');
        }

        setToken(token);
        setUser(user);

        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
    }, []);

    const sendRegisterCode = useCallback(async (email: string) => {
        const response = await fetch(`${AUTH_API_URL}/send-register-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null) as null | { error?: string; suggestLogin?: boolean };
            const error = new Error(errorData?.error || '发送验证码失败') as Error & { suggestLogin?: boolean };
            error.suggestLogin = errorData?.suggestLogin;
            throw error;
        }
    }, []);

    const sendResetCode = useCallback(async (email: string) => {
        const response = await fetch(`${AUTH_API_URL}/send-reset-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '发送验证码失败');
            throw new Error(message);
        }
    }, []);

    const register = useCallback(async (username: string, email: string, code: string, password: string) => {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ username, email, code, password }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null) as null | { error?: string; suggestLogin?: boolean };
            const error = new Error(errorData?.error || '注册失败') as Error & { suggestLogin?: boolean };
            error.suggestLogin = errorData?.suggestLogin;
            throw error;
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
    }, []);

    const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
        const response = await fetch(`${AUTH_API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
            body: JSON.stringify({ email, code, newPassword }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '重置密码失败');
            throw new Error(message);
        }
    }, []);

    const logout = useCallback(() => {
        if (token) {
            fetch(`${AUTH_API_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Accept-Language': i18n.language,
                    'Authorization': `Bearer ${token}`,
                },
            }).catch(() => {
                // 忽略失败，继续本地退出
            });
        }

        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }, [token]);

    const sendEmailCode = useCallback(async (email: string) => {
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
            const message = await parseErrorMessage(response, '发送验证码失败');
            throw new Error(message);
        }
    }, [token]);

    const verifyEmail = useCallback(async (email: string, code: string) => {
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
            const message = await parseErrorMessage(response, '验证失败');
            throw new Error(message);
        }

        const data = await response.json();
        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }, [token]);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        if (!token) throw new Error('请先登录');

        const response = await fetch(`${AUTH_API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '修改密码失败');
            throw new Error(message);
        }
    }, [token]);

    const updateUsername = useCallback(async (username: string) => {
        if (!token) throw new Error('请先登录');
        const trimmed = username.trim();
        if (!trimmed || trimmed.length < 2 || trimmed.length > 20) {
            throw new Error('昵称长度应在 2-20 个字符之间');
        }

        const response = await fetch(`${AUTH_API_URL}/update-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ username: trimmed }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '昵称修改失败');
            throw new Error(message);
        }

        const data = await response.json();
        const updatedUser = { ...user, ...data.user } as User;
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return updatedUser;
    }, [token, user]);

    const updateAvatar = useCallback(async (avatar: string) => {
        if (!token) throw new Error('请先登录');
        const normalizedAvatar = avatar.trim();
        if (!normalizedAvatar) throw new Error('请输入头像地址');

        const response = await fetch(`${AUTH_API_URL}/update-avatar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ avatar: normalizedAvatar }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '头像更新失败');
            throw new Error(message);
        }

        const data = await response.json();
        const updatedUser = { ...user, ...data.user } as User;
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return updatedUser;
    }, [token, user]);

    const uploadAvatar = useCallback(async (file: File, cropData?: { x: number; y: number; width: number; height: number }) => {
        if (!token) throw new Error('请先登录');

        const formData = new FormData();
        formData.append('file', file);
        if (cropData) {
            formData.append('cropX', String(cropData.x));
            formData.append('cropY', String(cropData.y));
            formData.append('cropWidth', String(cropData.width));
            formData.append('cropHeight', String(cropData.height));
        }

        const response = await fetch(`${AUTH_API_URL}/upload-avatar`, {
            method: 'POST',
            headers: {
                'Accept-Language': i18n.language,
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response, '头像上传失败');
            throw new Error(message);
        }

        const data = await response.json();
        const updatedUser = { ...user, ...data.user } as User;
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return updatedUser;
    }, [token, user]);

    const contextValue = useMemo(() => ({
        user,
        token,
        login,
        register,
        sendRegisterCode,
        sendResetCode,
        resetPassword,
        logout,
        sendEmailCode,
        verifyEmail,
        changePassword,
        updateUsername,
        updateAvatar,
        uploadAvatar,
        isLoading,
    }), [
        user,
        token,
        login,
        register,
        sendRegisterCode,
        sendResetCode,
        resetPassword,
        logout,
        sendEmailCode,
        verifyEmail,
        changePassword,
        updateUsername,
        updateAvatar,
        uploadAvatar,
        isLoading,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    // Context 现在总是有值（要么是 Provider 提供的，要么是默认值）
    return context;
}
