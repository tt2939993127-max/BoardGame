import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    className?: string;
    loading?: boolean;
}

export default function StatsCard({ title, value, icon, trend, className, loading }: StatsCardProps) {
    return (
        <div className={cn("bg-white p-6 rounded-xl border border-slate-200 shadow-sm", className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-1" />
                    ) : (
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                    )}
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {icon}
                </div>
            </div>
            {trend && !loading && (
                <div className="mt-4 flex items-center text-sm">
                    <span
                        className={cn(
                            "font-medium mr-2",
                            trend.isPositive ? "text-green-600" : "text-red-600"
                        )}
                    >
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-slate-400">{trend.label}</span>
                </div>
            )}
        </div>
    );
}
