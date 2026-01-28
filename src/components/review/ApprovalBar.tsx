import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ApprovalBarProps {
    positive: number;
    total: number;
    rate: number;
    className?: string;
}

export const ApprovalBar = ({ total, rate, className }: ApprovalBarProps) => {
    const { t } = useTranslation(['review']);

    const isLowCount = total < 10;

    // Calculate width percentage for the bar
    const barWidth = `${rate}%`;

    return (
        <div className={clsx("flex flex-col gap-1 w-full max-w-sm", className)}>
            <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#433422]">
                    {isLowCount ? t('stats.fewReviews') : t('stats.positive', { rate })}
                </span>
                <span className="text-xs text-[#433422]/60">
                    {t('stats.count', { count: total })}
                </span>
            </div>

            <div className="h-2 w-full bg-[#433422]/10 rounded-full overflow-hidden">
                {!isLowCount && (
                    <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: barWidth }}
                    />
                )}
                {isLowCount && (
                    <div
                        className="h-full bg-[#433422]/20 rounded-full"
                        style={{ width: '100%' }}
                    />
                )}
            </div>
        </div>
    );
};
