import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { ModalBase } from '../common/overlays/ModalBase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
    closeOnBackdrop?: boolean;
}

export const AuthModal = ({ isOpen, onClose, initialMode = 'login', closeOnBackdrop }: AuthModalProps) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [account, setAccount] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { t } = useTranslation('auth');
    const { login, register, sendRegisterCode } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError('');
            setAccount('');
            setUsername('');
            setEmail('');
            setCode('');
            setPassword('');
            setConfirmPassword('');
            setCodeSent(false);
            setCountdown(0);
        }
    }, [isOpen, initialMode]);

    useEffect(() => {
        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    const handleSendCode = async () => {
        if (!email) {
            setError(t('email.error.missingEmail'));
            return;
        }
        setError('');
        setIsSendingCode(true);
        try {
            await sendRegisterCode(email);
            setCodeSent(true);
            setCountdown(60);
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('email.error.sendFailed'));
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                await login(account, password);
                onClose();
            } else {
                if (password !== confirmPassword) {
                    throw new Error(t('error.passwordMismatch'));
                }
                if (!code) {
                    throw new Error(t('email.error.missingCode'));
                }
                await register(username, email, code, password);
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error.operationFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        setCodeSent(false);
        setCountdown(0);
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
    };

    return (
        <ModalBase
            onClose={onClose}
            closeOnBackdrop={closeOnBackdrop}
            containerClassName="p-0"
        >
            <div className="bg-[#fcfbf9] pointer-events-auto w-[calc(100vw-2rem)] max-w-[400px] shadow-[0_10px_40px_rgba(67,52,34,0.1)] border border-[#e5e0d0] p-6 sm:p-10 relative rounded-sm mx-4">
                {/* 装饰边角 */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#c0a080]" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#c0a080]" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#c0a080]" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#c0a080]" />

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-serif font-bold text-[#433422] tracking-wide mb-2">
                        {t(mode === 'login' ? 'login.title' : 'register.title')}
                    </h2>
                    <div className="h-px w-12 bg-[#c0a080] mx-auto opacity-50" />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2 mb-6 font-serif text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 font-serif">
                    {mode === 'register' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-5"
                        >
                            <div>
                                <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                                    {t('email.label.address')}
                                </label>
                                <div className="flex gap-2 items-end">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex-1 px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-sm sm:text-lg"
                                        placeholder={t('email.placeholder.address')}
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendCode}
                                        disabled={isSendingCode || countdown > 0}
                                        className="px-3 py-1.5 bg-[#8c7b64] hover:bg-[#6b5d4a] text-white text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                                    >
                                        {isSendingCode
                                            ? t('email.button.sending')
                                            : countdown > 0
                                                ? t('email.button.resendCountdown', { count: countdown })
                                                : codeSent
                                                    ? t('email.button.resend')
                                                    : t('email.button.sendCode')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                                    {t('email.label.code')}
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-sm sm:text-lg"
                                    placeholder={t('email.placeholder.code')}
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </motion.div>
                    )}

                    {mode === 'login' ? (
                        <div>
                            <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                                {t('label.account', { defaultValue: '邮箱' })}
                            </label>
                            <input
                                type="text"
                                value={account}
                                onChange={(e) => setAccount(e.target.value)}
                                className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-sm sm:text-lg"
                                placeholder={t('placeholder.account', { defaultValue: '输入邮箱' })}
                                required
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                                {t('label.username')}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-sm sm:text-lg"
                                placeholder={t('placeholder.username')}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                            {t('label.password')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-sm sm:text-lg"
                            placeholder="••••"
                            required
                            minLength={4}
                        />
                    </div>

                    {mode === 'register' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                                {t('label.confirmPassword')}
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-lg"
                                placeholder="••••"
                                required
                                minLength={4}
                            />
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#433422] hover:bg-[#2b2114] text-[#fcfbf9] font-bold text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 cursor-pointer"
                    >
                        {isLoading
                            ? t('button.processing')
                            : t(mode === 'login' ? 'login.submit' : 'register.submit')}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-4 text-sm font-serif italic pb-2">
                    <button
                        type="button"
                        onClick={() => mode === 'register' && toggleMode()}
                        className={clsx(
                            "group relative cursor-pointer transition-colors px-1 py-1",
                            mode === 'login' ? "text-[#433422] font-bold" : "text-[#8c7b64] hover:text-[#433422]"
                        )}
                    >
                        <span className="relative z-10">{t('login.toggle_to_login', { defaultValue: '登入' })}</span>
                        <span className="underline-center h-[1px] opacity-60" />
                    </button>
                    <div className="w-px h-3 bg-[#c0a080] opacity-40" />
                    <button
                        type="button"
                        onClick={() => mode === 'login' && toggleMode()}
                        className={clsx(
                            "group relative cursor-pointer transition-colors px-1 py-1",
                            mode === 'register' ? "text-[#433422] font-bold" : "text-[#8c7b64] hover:text-[#433422]"
                        )}
                    >
                        <span className="relative z-10">{t('login.toggle_to_register', { defaultValue: '注册' })}</span>
                        <span className="underline-center h-[1px] opacity-60" />
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};
