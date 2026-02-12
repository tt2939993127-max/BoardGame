import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { ModalBase } from './ModalBase';
import { UI_Z_INDEX } from '../../../core';

interface PasswordEntryModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    closeOnBackdrop?: boolean;
}

export const PasswordEntryModal = ({
    open,
    onClose,
    onConfirm,
    closeOnBackdrop = true,
}: PasswordEntryModalProps) => {
    const { t } = useTranslation('lobby');
    const [password, setPassword] = useState('');

    const handleConfirm = () => {
        if (!password.trim()) return;
        onConfirm(password.trim());
    };

    return (
        <AnimatePresence>
            {open && (
                <ModalBase
                    onClose={onClose}
                    closeOnBackdrop={closeOnBackdrop}
                    overlayClassName="bg-[#2b2114]/30"
                    overlayStyle={{ zIndex: UI_Z_INDEX.modalOverlay }}
                    containerClassName="p-4 sm:p-6"
                    containerStyle={{ zIndex: UI_Z_INDEX.modalContent }}
                >
                    <div className="bg-parchment-card-bg border border-parchment-card-border/50 shadow-parchment-card-hover rounded-sm p-6 w-full max-w-[20rem] sm:max-w-sm text-center font-serif pointer-events-auto">
                        <div className="text-xs sm:text-sm text-parchment-light-text font-bold uppercase tracking-wider mb-2">
                            {t('password.modalTitle', 'Private Room')}
                        </div>
                        <div className="text-parchment-base-text font-bold text-sm sm:text-base mb-5">
                            {t('password.modalDesc', 'This room requires a password.')}
                        </div>

                        <input
                            type="password"
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                            placeholder={t('password.placeholder', 'Enter password...')}
                            className="w-full px-4 py-2 mb-6 rounded-[4px] text-sm border border-parchment-card-border/30 bg-parchment-base-bg/30 text-parchment-base-text placeholder:text-parchment-light-text/50 focus:outline-none focus:border-parchment-base-text transition-colors text-center"
                        />

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider border border-parchment-card-border/50 text-parchment-base-text bg-parchment-card-bg hover:bg-parchment-base-bg transition-colors rounded-[4px]"
                            >
                                {t('actions.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!password.trim()}
                                className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-parchment-base-text text-parchment-card-bg hover:bg-parchment-brown transition-colors rounded-[4px] disabled:opacity-50"
                            >
                                {t('actions.confirm', 'Confirm')}
                            </button>
                        </div>
                    </div>
                </ModalBase>
            )}
        </AnimatePresence>
    );
};
