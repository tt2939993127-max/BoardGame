import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../../contexts/ToastContext';
import { ToastItem } from '../common/feedback/ToastItem';

const ToastHarness = ({
    actionSpy,
    dismissOnClick = true,
}: {
    actionSpy: () => void;
    dismissOnClick?: boolean;
}) => {
    const toast = useToast();

    return (
        <>
            <button
                type="button"
                onClick={() => toast.info('Message body', 'Toast title', {
                    ttlMs: Infinity,
                    actions: [{
                        label: 'Enable compatibility',
                        variant: 'primary',
                        dismissOnClick,
                        onClick: actionSpy,
                    }],
                })}
            >
                show toast
            </button>
            <div>
                {toast.toasts.map((item) => (
                    <ToastItem key={item.id} toast={item} />
                ))}
            </div>
        </>
    );
};

describe('ToastItem actions', () => {
    it('executes the action and dismisses the toast by default', () => {
        const actionSpy = vi.fn();

        render(
            <ToastProvider>
                <ToastHarness actionSpy={actionSpy} />
            </ToastProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'show toast' }));
        fireEvent.click(screen.getByRole('button', { name: 'Enable compatibility' }));

        expect(actionSpy).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Toast title')).not.toBeInTheDocument();
    });

    it('keeps the toast visible when dismissOnClick is false', () => {
        const actionSpy = vi.fn();

        render(
            <ToastProvider>
                <ToastHarness actionSpy={actionSpy} dismissOnClick={false} />
            </ToastProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'show toast' }));
        fireEvent.click(screen.getByRole('button', { name: 'Enable compatibility' }));

        expect(actionSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Toast title')).toBeInTheDocument();
    });
});
