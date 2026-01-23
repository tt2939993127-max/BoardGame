import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { ModalBase } from '../common/ModalBase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
    closeOnBackdrop?: boolean;
}

export const AuthModal = ({ isOpen, onClose, initialMode = 'login', closeOnBackdrop }: AuthModalProps) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { t } = useTranslation('auth');
    const { login, register } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
        }
    }, [isOpen, initialMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                await login(username, password);
                onClose();
            } else {
                if (password !== confirmPassword) {
                    throw new Error(t('error.passwordMismatch'));
                }
                await register(username, password);
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
    };

    return (
        <ModalBase
            open={isOpen}
            onClose={onClose}
            closeOnBackdrop={closeOnBackdrop}
            overlayClassName="z-50 bg-[#433422]/20 transition-colors"
            containerClassName="z-50 p-4"
        >
            <div className="bg-[#fcfbf9] pointer-events-auto w-full max-w-sm shadow-[0_10px_40px_rgba(67,52,34,0.1)] border border-[#e5e0d0] p-8 relative rounded-sm">
                {/* Decorative Corners */}
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
                    <div>
                        <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                            {t('label.username')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-lg"
                            placeholder={t('placeholder.username')}
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2">
                            {t('label.password')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-0 py-2 bg-transparent border-b-2 border-[#e5e0d0] text-[#433422] placeholder-[#c0a080]/50 outline-none focus:border-[#433422] transition-colors text-lg"
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
                            <label className="block text-xs font-bold text-[#8c7b64] uppercase tracking-wider mb-2 mt-4">
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

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-sm text-[#8c7b64] hover:text-[#433422] underline decoration-1 underline-offset-4 transition-colors cursor-pointer font-serif italic"
                    >
                        {t(mode === 'login' ? 'login.toggle' : 'register.toggle')}
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};
