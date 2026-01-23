import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// 渲染函数由调用方提供，close 与遮罩策略由栈统一注入
type ModalRender = (api: { close: () => void; closeOnBackdrop: boolean }) => ReactNode;

export interface ModalEntry {
    id: string;
    render: ModalRender;
    // 默认行为：不配置则启用 ESC / 遮罩关闭 / 滚动锁
    closeOnEsc?: boolean;
    closeOnBackdrop?: boolean;
    lockScroll?: boolean;
    zIndex?: number;
    // 由栈触发的关闭回调（例如 ESC/编程关闭）
    onClose?: () => void;
}

interface ModalStackContextValue {
    stack: ModalEntry[];
    openModal: (entry: Omit<ModalEntry, 'id'> & { id?: string }) => string;
    closeModal: (id: string) => void;
    closeTop: () => void;
    replaceTop: (entry: Omit<ModalEntry, 'id'> & { id?: string }) => string;
    closeAll: (options?: { skipOnClose?: boolean }) => void;
}

const ModalStackContext = createContext<ModalStackContextValue | null>(null);

// 保证每次打开都有稳定唯一的栈条目 ID
const createId = () => `modal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const ModalStackProvider = ({ children }: { children: ReactNode }) => {
    const [stack, setStack] = useState<ModalEntry[]>([]);
    const stackRef = useRef<ModalEntry[]>([]);
    const pendingOnCloseRef = useRef<Array<() => void>>([]);

    const enqueueOnClose = useCallback((callbacks: Array<(() => void) | undefined>) => {
        callbacks.forEach((cb) => {
            if (cb) pendingOnCloseRef.current.push(cb);
        });
    }, []);

    useEffect(() => {
        stackRef.current = stack;
        if (!pendingOnCloseRef.current.length) return;
        const tasks = pendingOnCloseRef.current;
        pendingOnCloseRef.current = [];
        tasks.forEach((task) => task());
    }, [stack]);

    // 追加栈顶（默认行为由 ModalStackRoot 统一处理）
    const openModal = useCallback((entry: Omit<ModalEntry, 'id'> & { id?: string }) => {
        const id = entry.id ?? createId();
        setStack((prev) => [...prev, { ...entry, id }]);
        return id;
    }, []);

    // 精确关闭某个栈条目
    const closeModal = useCallback((id: string) => {
        const target = stackRef.current.find((item) => item.id === id);
        enqueueOnClose([target?.onClose]);
        setStack((prev) => prev.filter((item) => item.id !== id));
    }, [enqueueOnClose]);

    // 关闭栈顶
    const closeTop = useCallback(() => {
        const target = stackRef.current[stackRef.current.length - 1];
        enqueueOnClose([target?.onClose]);
        setStack((prev) => prev.slice(0, -1));
    }, [enqueueOnClose]);

    // 替换栈顶，用于从一个弹窗跳转到另一个弹窗
    const replaceTop = useCallback((entry: Omit<ModalEntry, 'id'> & { id?: string }) => {
        const id = entry.id ?? createId();
        const target = stackRef.current[stackRef.current.length - 1];
        enqueueOnClose([target?.onClose]);
        setStack((prev) => [...prev.slice(0, -1), { ...entry, id }]);
        return id;
    }, [enqueueOnClose]);

    // 关闭所有弹窗（默认触发各自 onClose，可按需跳过）
    const closeAll = useCallback((options?: { skipOnClose?: boolean }) => {
        const targets = stackRef.current;
        if (!options?.skipOnClose) {
            enqueueOnClose(targets.map((item) => item.onClose));
        }
        setStack([]);
    }, [enqueueOnClose]);

    const value = useMemo(
        () => ({ stack, openModal, closeModal, closeTop, replaceTop, closeAll }),
        [stack, openModal, closeModal, closeTop, replaceTop, closeAll]
    );

    return <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>;
};

export const useModalStack = () => {
    const context = useContext(ModalStackContext);
    if (!context) {
        throw new Error('useModalStack 必须在 ModalStackProvider 内使用');
    }
    return context;
};
