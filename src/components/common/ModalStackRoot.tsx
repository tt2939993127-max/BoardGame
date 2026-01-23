import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useModalStack } from '../../contexts/ModalStackContext';

// 默认起始层级，需覆盖常规页面元素且低于教程/调试层
const DEFAULT_Z_INDEX = 2000;

export const ModalStackRoot = () => {
    const { stack, closeTop, closeModal, closeAll } = useModalStack();
    const location = useLocation();

    useEffect(() => {
        return () => {
            closeAll({ skipOnClose: true });
        };
    }, [closeAll, location.key]);

    // 栈顶条目决定交互与 ESC 行为
    const topEntry = stack[stack.length - 1];

    // 统一渲染到 #modal-root，避免被父容器裁切
    const portalRoot = useMemo(() => {
        if (typeof document === 'undefined') return null;
        return document.getElementById('modal-root');
    }, []);

    // 默认 ESC 关闭栈顶（可由条目关闭）
    useEffect(() => {
        if (!topEntry) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (topEntry.closeOnEsc === false) return;
            event.stopPropagation();
            closeTop();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeTop, topEntry]);

    // 栈内任意条目需要时锁定 body 滚动，并补偿滚动条宽度
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const shouldLock = stack.some((entry) => entry.lockScroll !== false);
        if (!shouldLock) return;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
        };
    }, [stack]);

    if (!portalRoot) return null;

    return createPortal(
        // Portal 容器必须显式层级，否则处于 auto 层会被页面正 z-index 覆盖
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: DEFAULT_Z_INDEX }}>
            <AnimatePresence>
                {stack.map((entry, index) => {
                    const isTop = index === stack.length - 1;
                    const zIndex = entry.zIndex ?? DEFAULT_Z_INDEX + index * 10;
                    return (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            // 非栈顶禁止交互，只保留视觉层级
                            className="fixed inset-0"
                            style={{ zIndex, pointerEvents: isTop ? 'auto' : 'none' }}
                        >
                            {entry.render({
                                close: () => closeModal(entry.id),
                                closeOnBackdrop: entry.closeOnBackdrop ?? true,
                            })}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>,
        portalRoot
    );
};
