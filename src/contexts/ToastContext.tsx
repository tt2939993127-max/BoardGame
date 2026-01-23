import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export type ToastContent =
    | { kind: 'text'; text: string }
    | { kind: 'i18n'; ns?: string; key: string; params?: Record<string, string | number> };

export interface Toast {
    id: string;
    tone: ToastTone;
    title?: ToastContent;
    message: ToastContent;
    createdAt: number;
    ttlMs?: number;
    dedupeKey?: string;
}

interface ToastContextType {
    toasts: Toast[];
    show: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
    success: (message: string | ToastContent, title?: string | ToastContent, options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'tone' | 'message' | 'title'>>) => string;
    info: (message: string | ToastContent, title?: string | ToastContent, options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'tone' | 'message' | 'title'>>) => string;
    warning: (message: string | ToastContent, title?: string | ToastContent, options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'tone' | 'message' | 'title'>>) => string;
    error: (message: string | ToastContent, title?: string | ToastContent, options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'tone' | 'message' | 'title'>>) => string;
    dismiss: (id: string) => void;
    clear: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_TTL: Record<ToastTone, number> = {
    success: 3000,
    info: 4000,
    warning: 5000,
    error: 8000,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastsRef = useRef<Toast[]>([]);

    // Keep ref in sync for timeouts
    useEffect(() => {
        toastsRef.current = toasts;
    }, [toasts]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((toastInput: Omit<Toast, 'id' | 'createdAt'>) => {
        const { dedupeKey, tone } = toastInput;

        // Deduplication check
        if (dedupeKey) {
            const existing = toastsRef.current.find((t) => t.dedupeKey === dedupeKey);
            if (existing) {
                // If it exists, just update its timestamp to keep it alive or ignore if too recent
                // For now, let's just ignore to prevent spamming
                return existing.id;
            }
        }

        const id = crypto.randomUUID();
        const createdAt = Date.now();
        const ttlMs = toastInput.ttlMs ?? DEFAULT_TTL[tone];

        const newToast: Toast = {
            ...toastInput,
            id,
            createdAt,
            ttlMs,
        };

        setToasts((prev) => [...prev, newToast]);

        if (ttlMs !== Infinity) {
            setTimeout(() => {
                dismiss(id);
            }, ttlMs);
        }

        return id;
    }, [dismiss]);

    const normalizeContent = (content: string | ToastContent): ToastContent => {
        if (typeof content === 'string') {
            return { kind: 'text', text: content };
        }
        return content;
    };

    const success = useCallback((message: string | ToastContent, title?: string | ToastContent, options?: any) =>
        show({ tone: 'success', message: normalizeContent(message), title: title ? normalizeContent(title) : undefined, ...options }), [show]);

    const info = useCallback((message: string | ToastContent, title?: string | ToastContent, options?: any) =>
        show({ tone: 'info', message: normalizeContent(message), title: title ? normalizeContent(title) : undefined, ...options }), [show]);

    const warning = useCallback((message: string | ToastContent, title?: string | ToastContent, options?: any) =>
        show({ tone: 'warning', message: normalizeContent(message), title: title ? normalizeContent(title) : undefined, ...options }), [show]);

    const error = useCallback((message: string | ToastContent, title?: string | ToastContent, options?: any) =>
        show({ tone: 'error', message: normalizeContent(message), title: title ? normalizeContent(title) : undefined, ...options }), [show]);

    const clear = useCallback(() => setToasts([]), []);

    return (
        <ToastContext.Provider value={{ toasts, show, success, info, warning, error, dismiss, clear }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
