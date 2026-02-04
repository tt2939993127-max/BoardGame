import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';
import { ModalBase } from './ModalBase';

type ConfirmTone = 'warm' | 'cool';

interface ConfirmModalTheme {
    overlay: string;
    container?: string;
    panel: string;
    title: string;
    description: string;
    actions: string;
    confirmButton: string;
    cancelButton: string;
}

interface ConfirmModalProps {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    tone?: ConfirmTone;
    theme?: Partial<ConfirmModalTheme>;
    closeOnBackdrop?: boolean;
    overlayClassName?: string;
    containerClassName?: string;
    panelClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    actionsClassName?: string;
    confirmClassName?: string;
    cancelClassName?: string;
}

const baseTheme: Omit<ConfirmModalTheme, 'overlay'> = {
    panel: 'bg-parchment-card-bg border border-parchment-card-border/50 shadow-parchment-card-hover rounded-sm p-6 w-full max-w-[20rem] sm:max-w-sm text-center font-serif pointer-events-auto',
    title: 'text-xs sm:text-sm text-parchment-light-text font-bold uppercase tracking-wider mb-2',
    description: 'text-parchment-base-text font-bold text-sm sm:text-base mb-5',
    actions: 'flex items-center justify-center gap-3',
    confirmButton: 'px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-parchment-base-text text-parchment-card-bg hover:bg-parchment-brown transition-colors rounded-[4px]',
    cancelButton: 'px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider border border-parchment-card-border/50 text-parchment-base-text bg-parchment-card-bg hover:bg-parchment-base-bg transition-colors rounded-[4px]',
};

const themeByTone: Record<ConfirmTone, ConfirmModalTheme> = {
    warm: {
        overlay: 'bg-[#2b2114]/30',
        ...baseTheme,
    },
    cool: {
        overlay: 'bg-slate-900/40',
        ...baseTheme,
    },
};

export const ConfirmModal = ({
    title,
    description,
    confirmText,
    cancelText,
    showCancel = true,
    onConfirm,
    onCancel,
    tone = 'warm',
    theme,
    closeOnBackdrop,
    overlayClassName,
    containerClassName,
    panelClassName,
    titleClassName,
    descriptionClassName,
    actionsClassName,
    confirmClassName,
    cancelClassName,
}: ConfirmModalProps) => {
    const { t } = useTranslation('common');
    const mergedTheme = {
        ...themeByTone[tone],
        ...theme,
    };
    const resolvedConfirmText = confirmText ?? t('button.confirm');
    const resolvedCancelText = cancelText ?? t('button.cancel');

    return (
        <ModalBase
            onClose={onCancel}
            closeOnBackdrop={closeOnBackdrop}
            overlayClassName={twMerge('z-[60]', mergedTheme.overlay, overlayClassName)}
            containerClassName={twMerge('z-[61] p-4 sm:p-6', mergedTheme.container, containerClassName)}
        >
            <div
                className={twMerge(
                    mergedTheme.panel,
                    panelClassName
                )}
            >
                <div
                    className={twMerge(mergedTheme.title, titleClassName)}
                >
                    {title}
                </div>
                <div
                    className={twMerge(mergedTheme.description, descriptionClassName)}
                >
                    {description}
                </div>
                <div className={twMerge(mergedTheme.actions, actionsClassName)}>
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            className={twMerge(
                                mergedTheme.cancelButton,
                                cancelClassName
                            )}
                        >
                            {resolvedCancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={twMerge(
                            mergedTheme.confirmButton,
                            confirmClassName
                        )}
                    >
                        {resolvedConfirmText}
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};
