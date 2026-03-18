import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Circle,
    Contact,
    Copy,
    Gamepad2,
    HelpCircle,
    Lightbulb,
    RefreshCw,
    ScrollText,
    Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ADMIN_API_URL } from '../../config/server';
import ImageLightbox from '../../components/common/ImageLightbox';
import { cn } from '../../lib/utils';
import {
    buildFeedbackAiPayload,
    CopyFeedbackButton,
    extractEmbeddedImages,
    extractText,
    FeedbackContent,
    type FeedbackItem,
    formatViewport,
    parseOperationLogs,
} from './feedback-shared';

type StatusOption = { value: FeedbackItem['status']; color: string };
type StatusOptionWithLabel = StatusOption & { label: string };
type TypeOption = { value: FeedbackItem['type']; icon: React.ElementType; iconColor: string };
type TypeOptionWithLabel = TypeOption & { label: string };
type SeverityOption = { value: FeedbackItem['severity']; label: string; dot: string };

const STATUS_OPTIONS: StatusOption[] = [
    { value: 'open', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'in_progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'closed', color: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
];

const TYPE_OPTIONS: TypeOption[] = [
    { value: 'bug', icon: AlertTriangle, iconColor: 'text-red-500' },
    { value: 'suggestion', icon: Lightbulb, iconColor: 'text-amber-500' },
    { value: 'other', icon: HelpCircle, iconColor: 'text-blue-500' },
];

const SEVERITY_DOTS: Record<FeedbackItem['severity'], string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
};

const POLL_INTERVAL = 30_000;
const PAGE_SIZE = 20;

const buildStatusOptions = (t: TFunction<'admin'>): StatusOptionWithLabel[] => (
    STATUS_OPTIONS.map((option) => ({
        ...option,
        label: t(`feedback.status.${option.value}`),
    }))
);

const buildTypeOptions = (t: TFunction<'admin'>): TypeOptionWithLabel[] => (
    TYPE_OPTIONS.map((option) => ({
        ...option,
        label: t(`feedback.type.${option.value}`),
    }))
);

const buildSeverityOptions = (t: TFunction<'admin'>): SeverityOption[] => ([
    { value: 'critical', label: t('feedback.severity.critical'), dot: SEVERITY_DOTS.critical },
    { value: 'high', label: t('feedback.severity.high'), dot: SEVERITY_DOTS.high },
    { value: 'medium', label: t('feedback.severity.medium'), dot: SEVERITY_DOTS.medium },
    { value: 'low', label: t('feedback.severity.low'), dot: SEVERITY_DOTS.low },
]);

function StatusSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: StatusOptionWithLabel[];
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className={cn(
                    'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
                    current.color
                )}
            >
                {current.label}
                <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-50',
                                option.value === value ? 'font-semibold text-zinc-900' : 'text-zinc-600'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ value, options }: { value: string; options: StatusOptionWithLabel[] }) {
    const current = options.find((option) => option.value === value) ?? options[0];

    return (
        <span className={cn('inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium', current.color)}>
            {current.label}
        </span>
    );
}

function FilterTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                active ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            )}
        >
            {children}
        </button>
    );
}

function SummaryCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'amber' | 'red' | 'emerald' | 'blue';
}) {
    const toneClassMap = {
        amber: 'border-amber-200 bg-amber-50/70 text-amber-700',
        red: 'border-red-200 bg-red-50/70 text-red-700',
        emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
        blue: 'border-blue-200 bg-blue-50/70 text-blue-700',
    } as const;

    return (
        <div className={cn('rounded-2xl border px-4 py-3', toneClassMap[tone])}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</div>
            <div className="mt-1 text-2xl font-semibold leading-none">{value}</div>
            <div className="mt-1 text-xs opacity-75">当前页</div>
        </div>
    );
}

function MetaField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</div>
            <div className={cn('mt-1 break-all text-sm text-zinc-700', mono && 'font-mono text-[12px]')}>{value || '无'}</div>
        </div>
    );
}

function MetaBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-500">
            {children}
        </span>
    );
}

export default function AdminFeedbackPage() {
    const { token, user } = useAuth();
    const { success, error } = useToast();
    const { t } = useTranslation('admin');
    const canManageFeedback = user?.role === 'admin';

    const statusOptions = useMemo(() => buildStatusOptions(t), [t]);
    const typeOptions = useMemo(() => buildTypeOptions(t), [t]);
    const severityOptions = useMemo(() => buildSeverityOptions(t), [t]);

    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [lastAiPayload, setLastAiPayload] = useState('');
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchFeedbacks = useCallback(async (silent = false) => {
        const requestId = ++requestIdRef.current;
        if (!silent) setLoading(true);
        if (silent) setIsPolling(true);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(PAGE_SIZE),
            });
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);
            if (severityFilter !== 'all') params.set('severity', severityFilter);

            const response = await fetch(`${ADMIN_API_URL}/feedback?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('fetch_failed');

            const data = await response.json();
            if (!isMountedRef.current || requestId !== requestIdRef.current) {
                return;
            }

            setFeedbacks(data.items);
            const nextTotalItems = Number(data.total) || 0;
            const nextLimit = Number(data.limit) || PAGE_SIZE;
            const nextTotalPages = Math.max(1, Math.ceil(nextTotalItems / nextLimit));
            setTotalItems(nextTotalItems);
            setTotalPages(nextTotalPages);

            const currentServerPage = Number(data.page) || page;
            if (currentServerPage > nextTotalPages) {
                setPage(nextTotalPages);
            }
        } catch {
            if (!silent) {
                error(t('feedback.messages.fetchFailed'));
            }
        } finally {
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setLoading(false);
                setIsPolling(false);
            }
        }
    }, [error, page, severityFilter, statusFilter, t, token, typeFilter]);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    useEffect(() => {
        const timer = setInterval(() => fetchFeedbacks(true), POLL_INTERVAL);
        return () => clearInterval(timer);
    }, [fetchFeedbacks]);

    useEffect(() => {
        setSelectedIds((prev) => {
            const next = new Set<string>();
            prev.forEach((id) => {
                if (feedbacks.some((item) => item._id === id)) {
                    next.add(id);
                }
            });
            return next.size === prev.size ? prev : next;
        });

        if (expandedId && !feedbacks.some((item) => item._id === expandedId)) {
            setExpandedId(null);
        }
    }, [expandedId, feedbacks]);

    const summary = useMemo(() => {
        return feedbacks.reduce((acc, item) => {
            if (item.status === 'open' || item.status === 'in_progress') acc.actionable += 1;
            if (item.severity === 'high' || item.severity === 'critical') acc.highPriority += 1;
            if (item.actionLog || item.stateSnapshot || item.clientContext || item.errorContext) acc.withContext += 1;
            if ((item.type === 'bug' || item.errorContext) && (item.actionLog || item.stateSnapshot || item.clientContext)) {
                acc.forwardable += 1;
            }
            return acc;
        }, { actionable: 0, highPriority: 0, withContext: 0, forwardable: 0 });
    }, [feedbacks]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const changeFilter = (setter: (value: string) => void, value: string) => {
        setter(value);
        setPage(1);
        setSelectedIds(new Set());
        setExpandedId(null);
    };

    const handleStatusUpdate = useCallback(async (id: string, newStatus: string) => {
        if (!canManageFeedback) {
            error('开发者当前仅可查看反馈。');
            return;
        }

        try {
            const response = await fetch(`${ADMIN_API_URL}/feedback/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error('update_failed');

            setFeedbacks((prev) => prev.map((item) => (
                item._id === id ? { ...item, status: newStatus as FeedbackItem['status'] } : item
            )));
            success(t('feedback.messages.updateSuccess'));
        } catch {
            error(t('feedback.messages.updateFailed'));
        }
    }, [canManageFeedback, error, success, t, token]);

    const handleDelete = useCallback(async (id: string) => {
        if (!canManageFeedback) {
            error('开发者当前仅可查看反馈。');
            return;
        }
        if (!confirm(t('feedback.confirm.delete'))) return;

        try {
            const response = await fetch(`${ADMIN_API_URL}/feedback/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('delete_failed');

            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            if (feedbacks.length === 1 && page > 1) {
                setPage((prev) => Math.max(1, prev - 1));
            } else {
                fetchFeedbacks();
            }
            success(t('feedback.messages.deleteSuccess'));
        } catch {
            error(t('feedback.messages.deleteFailed'));
        }
    }, [canManageFeedback, error, feedbacks.length, fetchFeedbacks, page, success, t, token]);

    const handleBulkDelete = useCallback(async () => {
        if (!canManageFeedback) {
            error('开发者当前仅可查看反馈。');
            return;
        }
        if (selectedIds.size === 0) return;
        if (!confirm(t('feedback.confirm.bulkDelete', { count: selectedIds.size }))) return;

        try {
            const response = await fetch(`${ADMIN_API_URL}/feedback/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            if (!response.ok) throw new Error('bulk_delete_failed');

            success(t('feedback.messages.bulkDeleteSuccess'));
            setSelectedIds(new Set());
            if (selectedIds.size === feedbacks.length && page > 1) {
                setPage((prev) => Math.max(1, prev - 1));
            } else {
                fetchFeedbacks();
            }
        } catch {
            error(t('feedback.messages.bulkDeleteFailed'));
        }
    }, [canManageFeedback, error, feedbacks.length, fetchFeedbacks, page, selectedIds, success, t, token]);

    const pageStart = totalItems > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
    const pageEnd = totalItems > 0 ? Math.min(page * PAGE_SIZE, totalItems) : 0;

    return (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col p-6">
            <div className="mb-4 flex flex-none items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-lg font-bold text-zinc-900">{t('feedback.title')}</h1>
                        <span className="text-xs text-zinc-400">{t('feedback.count', { count: totalItems })}</span>
                        {!canManageFeedback && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                只读
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => fetchFeedbacks()}
                            title={t('feedback.refresh')}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                        >
                            <RefreshCw size={14} className={cn(isPolling && 'animate-spin')} />
                        </button>
                        {isPolling && <span className="text-[10px] text-zinc-400">{t('feedback.polling')}</span>}
                    </div>
                    <p className="text-sm text-zinc-500">
                        默认先看待处理反馈，展开后可以直接复制完整分诊包继续转发，不需要手动拼上下文。
                    </p>
                </div>
                {canManageFeedback && selectedIds.size > 0 && (
                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                        <Trash2 size={12} />
                        {t('feedback.bulkDelete', { count: selectedIds.size })}
                    </button>
                )}
            </div>

            <div className="mb-4 grid flex-none gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="待跟进" value={summary.actionable} tone="amber" />
                <SummaryCard label="高优先级" value={summary.highPriority} tone="red" />
                <SummaryCard label="带上下文" value={summary.withContext} tone="emerald" />
                <SummaryCard label="可直接转发" value={summary.forwardable} tone="blue" />
            </div>

            <div className="mb-3 flex flex-none flex-col gap-3 rounded-2xl border border-zinc-100 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-400">状态</span>
                    <FilterTab active={statusFilter === 'all'} onClick={() => changeFilter(setStatusFilter, 'all')}>
                        全部
                    </FilterTab>
                    {statusOptions.map((option) => (
                        <FilterTab
                            key={option.value}
                            active={statusFilter === option.value}
                            onClick={() => changeFilter(setStatusFilter, option.value)}
                        >
                            {option.label}
                        </FilterTab>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-400">类型</span>
                    <FilterTab active={typeFilter === 'all'} onClick={() => changeFilter(setTypeFilter, 'all')}>
                        全部
                    </FilterTab>
                    {typeOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <FilterTab
                                key={option.value}
                                active={typeFilter === option.value}
                                onClick={() => changeFilter(setTypeFilter, option.value)}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <Icon size={12} className={option.iconColor} />
                                    {option.label}
                                </span>
                            </FilterTab>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-400">严重程度</span>
                    <FilterTab active={severityFilter === 'all'} onClick={() => changeFilter(setSeverityFilter, 'all')}>
                        全部
                    </FilterTab>
                    {severityOptions.map((option) => (
                        <FilterTab
                            key={option.value}
                            active={severityFilter === option.value}
                            onClick={() => changeFilter(setSeverityFilter, option.value)}
                        >
                            <span className="inline-flex items-center gap-1">
                                <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                                {option.label}
                            </span>
                        </FilterTab>
                    ))}
                </div>
            </div>

            {!canManageFeedback && (
                <div className="mb-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
                    开发者可以查看与复制反馈分诊包，但状态更新和删除仍然只有管理员可用。
                </div>
            )}

            {lastAiPayload && (
                <div className="mb-3 flex-none rounded-2xl border border-zinc-900 bg-zinc-950 p-4 text-zinc-50" data-testid="feedback-ai-payload-viewer-panel">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">最近复制的分诊包</div>
                    <textarea
                        readOnly
                        value={lastAiPayload}
                        data-testid="feedback-ai-payload-viewer"
                        className="h-40 w-full rounded-xl border border-zinc-800 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-emerald-200"
                    />
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="animate-spin text-zinc-300" size={24} />
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-20 text-center text-sm text-zinc-400">
                        {t('feedback.table.empty')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbacks.map((item) => {
                            const expanded = expandedId === item._id;
                            const typeOption = typeOptions.find((option) => option.value === item.type);
                            const severityOption = severityOptions.find((option) => option.value === item.severity) ?? severityOptions[3];

                            return (
                                <FeedbackCard
                                    key={item._id}
                                    item={item}
                                    expanded={expanded}
                                    selected={selectedIds.has(item._id)}
                                    canManageFeedback={canManageFeedback}
                                    typeOption={typeOption}
                                    severityOption={severityOption}
                                    statusOptions={statusOptions}
                                    t={t}
                                    onToggleExpand={() => setExpandedId(expanded ? null : item._id)}
                                    onToggleSelect={() => toggleSelect(item._id)}
                                    onStatusUpdate={handleStatusUpdate}
                                    onDelete={handleDelete}
                                    onImageClick={setPreviewImage}
                                    onAiPayloadCopy={setLastAiPayload}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-3 flex flex-none items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-3">
                <div className="text-xs text-zinc-500">
                    {totalItems > 0 ? `第 ${pageStart}-${pageEnd} 条，共 ${totalItems} 条` : '暂无反馈'}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page <= 1 || loading}
                        data-testid="feedback-pagination-prev"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft size={14} />
                        上一页
                    </button>
                    <span className="text-xs font-medium text-zinc-600" data-testid="feedback-pagination-indicator">
                        {page} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages || loading}
                        data-testid="feedback-pagination-next"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        下一页
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
        </div>
    );
}

interface FeedbackCardProps {
    item: FeedbackItem;
    expanded: boolean;
    selected: boolean;
    canManageFeedback: boolean;
    typeOption: TypeOptionWithLabel | undefined;
    severityOption: SeverityOption;
    statusOptions: StatusOptionWithLabel[];
    t: TFunction<'admin'>;
    onToggleExpand: () => void;
    onToggleSelect: () => void;
    onStatusUpdate: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    onImageClick: (src: string) => void;
    onAiPayloadCopy: (payloadText: string) => void;
}

function FeedbackCard({
    item,
    expanded,
    selected,
    canManageFeedback,
    typeOption,
    severityOption,
    statusOptions,
    t,
    onToggleExpand,
    onToggleSelect,
    onStatusUpdate,
    onDelete,
    onImageClick,
    onAiPayloadCopy,
}: FeedbackCardProps) {
    const TypeIcon = typeOption?.icon ?? HelpCircle;
    const previewText = extractText(item.content, t);
    const images = extractEmbeddedImages(item.content);
    const operationLogs = parseOperationLogs(item.actionLog);
    const aiPayloadText = JSON.stringify(buildFeedbackAiPayload(item, t), null, 2);
    const contextGame = item.clientContext?.gameId || item.gameName || null;

    return (
        <section
            data-testid="feedback-row"
            data-feedback-id={item._id}
            className={cn(
                'rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors',
                expanded ? 'border-zinc-300' : 'hover:border-zinc-300',
                selected && 'ring-2 ring-indigo-200'
            )}
        >
            <div className="flex gap-3 p-4">
                {canManageFeedback && (
                    <div className="pt-1" onClick={(event) => event.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={onToggleSelect}
                            className="rounded border-zinc-300"
                            aria-label={t('feedback.table.selectItem', { id: item._id })}
                        />
                    </div>
                )}
                <button
                    type="button"
                    onClick={onToggleExpand}
                    className="mt-0.5 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <button type="button" onClick={onToggleExpand} className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">
                                    <TypeIcon size={12} className={typeOption?.iconColor ?? 'text-zinc-400'} />
                                    {typeOption?.label ?? item.type}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">
                                    <span className={cn('h-2 w-2 rounded-full', severityOption.dot)} />
                                    {severityOption.label}
                                </span>
                                {canManageFeedback ? (
                                    <div onClick={(event) => event.stopPropagation()}>
                                        <StatusSelect value={item.status} onChange={(value) => onStatusUpdate(item._id, value)} options={statusOptions} />
                                    </div>
                                ) : (
                                    <StatusBadge value={item.status} options={statusOptions} />
                                )}
                                {images.length > 0 && <MetaBadge>截图 {images.length}</MetaBadge>}
                                {item.actionLog && <MetaBadge>操作日志</MetaBadge>}
                                {item.stateSnapshot && <MetaBadge>状态快照</MetaBadge>}
                                {item.errorContext && <MetaBadge>错误上下文</MetaBadge>}
                            </div>
                            <p className="mt-3 line-clamp-2 text-base font-medium text-zinc-900">{previewText}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {contextGame && (
                                    <MetaBadge>
                                        <span className="inline-flex items-center gap-1">
                                            <Gamepad2 size={12} />
                                            {contextGame}
                                        </span>
                                    </MetaBadge>
                                )}
                                {item.clientContext?.route && <MetaBadge>{item.clientContext.route}</MetaBadge>}
                                {item.clientContext?.matchId && <MetaBadge>对局 {item.clientContext.matchId}</MetaBadge>}
                                {item.errorContext?.name && <MetaBadge>{item.errorContext.name}</MetaBadge>}
                                {item.contactInfo && (
                                    <MetaBadge>
                                        <span className="inline-flex items-center gap-1">
                                            <Contact size={12} />
                                            {item.contactInfo}
                                        </span>
                                    </MetaBadge>
                                )}
                            </div>
                        </button>

                        <div className="flex flex-col items-end gap-2 text-right">
                            <div className="text-sm font-medium text-zinc-700">{item.userId?.username || t('feedback.anonymous')}</div>
                            {item.userId?.email && <div className="text-xs text-zinc-400">{item.userId.email}</div>}
                            <div className="text-xs text-zinc-400 tabular-nums">{formatTime(item.createdAt, t)}</div>
                            <div className="text-[11px] text-zinc-400">{t('feedback.table.id', { id: item._id })}</div>
                            {canManageFeedback && (
                                <div className="flex items-center gap-1 pt-1" onClick={(event) => event.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => onStatusUpdate(item._id, item.status === 'resolved' ? 'open' : 'resolved')}
                                        className="rounded p-1 transition-colors hover:bg-zinc-100"
                                        title={item.status === 'resolved' ? t('feedback.actions.reopen') : t('feedback.actions.resolve')}
                                    >
                                        {item.status === 'resolved'
                                            ? <Circle size={14} className="text-zinc-400" />
                                            : <CheckCircle size={14} className="text-emerald-500" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(item._id)}
                                        className="rounded p-1 transition-colors hover:bg-red-50"
                                        title={t('feedback.actions.delete')}
                                    >
                                        <Trash2 size={14} className="text-zinc-300 hover:text-red-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.16 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 grid gap-4 border-t border-zinc-100 pt-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">用户原始反馈</div>
                                            <FeedbackContent content={item.content} onImageClick={onImageClick} t={t} />
                                        </div>

                                        {item.actionLog && (
                                            <details className="rounded-2xl border border-zinc-200 bg-white p-4" data-testid="feedback-action-log-section" data-feedback-id={item._id}>
                                                <summary
                                                    data-testid="feedback-action-log-toggle"
                                                    className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500"
                                                >
                                                    操作日志 ({operationLogs.length})
                                                </summary>
                                                <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-[11px] leading-relaxed text-zinc-700">
                                                    {item.actionLog}
                                                </pre>
                                            </details>
                                        )}

                                        {item.stateSnapshot && (
                                            <details className="rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-zinc-50" data-testid="feedback-state-snapshot-section" data-feedback-id={item._id}>
                                                <summary
                                                    data-testid="feedback-state-snapshot-toggle"
                                                    className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400"
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        <ScrollText size={12} />
                                                        状态快照 JSON
                                                    </span>
                                                </summary>
                                                <div className="relative mt-3">
                                                    <pre className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-black/30 p-3 text-[11px] leading-relaxed text-emerald-200">
                                                        {item.stateSnapshot}
                                                    </pre>
                                                    <button
                                                        type="button"
                                                        data-testid="feedback-copy-state-json-inline"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            navigator.clipboard.writeText(item.stateSnapshot!).catch(() => undefined);
                                                        }}
                                                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] text-white transition-colors hover:bg-emerald-500"
                                                    >
                                                        <Copy size={10} />
                                                        复制 JSON
                                                    </button>
                                                </div>
                                            </details>
                                        )}
                                    </div>

                                    <aside className="space-y-4">
                                        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                                            <div className="mb-3">
                                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">分诊摘要</div>
                                                <p className="mt-1 text-sm text-zinc-500">展开后直接查看上下文，不必翻日志或手抄字段。</p>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                                <MetaField label="提交者" value={item.userId?.username || t('feedback.anonymous')} />
                                                <MetaField label="账号邮箱" value={item.userId?.email || null} />
                                                <MetaField label="联系方式" value={item.contactInfo || null} />
                                                <MetaField label="游戏" value={contextGame} />
                                                <MetaField label="页面路由" value={item.clientContext?.route || null} mono />
                                                <MetaField label="运行模式" value={item.clientContext?.mode || null} />
                                                <MetaField label="对局 ID" value={item.clientContext?.matchId || null} mono />
                                                <MetaField label="玩家 ID" value={item.clientContext?.playerId || null} mono />
                                                <MetaField label="版本" value={item.clientContext?.appVersion || null} mono />
                                                <MetaField label="视口" value={formatViewport(item.clientContext?.viewport)} />
                                                <MetaField label="语言" value={item.clientContext?.language || null} />
                                                <MetaField label="时区" value={item.clientContext?.timezone || null} />
                                            </div>

                                            {item.errorContext && (
                                                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/80 p-4" data-testid="feedback-error-context-panel">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-red-500">错误上下文</div>
                                                    <div className="mt-3 grid gap-3">
                                                        <MetaField label="错误类型" value={item.errorContext.name || null} />
                                                        <MetaField label="错误来源" value={item.errorContext.source || null} />
                                                        <MetaField label="错误消息" value={item.errorContext.message || null} />
                                                        {item.errorContext.stack && (
                                                            <details>
                                                                <summary className="cursor-pointer text-xs font-medium text-red-500">查看错误堆栈</summary>
                                                                <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-red-100 bg-white/80 p-3 text-[11px] leading-relaxed text-zinc-700">
                                                                    {item.errorContext.stack}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 text-zinc-50">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">转发给助手</div>
                                                    <p className="mt-1 text-sm text-zinc-400">这里是当前反馈的真实分诊包，复制后可以直接继续排查。</p>
                                                </div>
                                                <CopyFeedbackButton item={item} t={t} onAiPayloadCopy={onAiPayloadCopy} />
                                            </div>
                                            <pre className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-black/30 p-3 text-[11px] leading-relaxed text-emerald-200" data-testid="feedback-ai-handoff-preview">
                                                {aiPayloadText}
                                            </pre>
                                        </div>
                                    </aside>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}

function formatTime(iso: string, t: TFunction<'admin'>): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return t('feedback.time.justNow');
    if (diffMin < 60) return t('feedback.time.minutesAgo', { count: diffMin });

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t('feedback.time.hoursAgo', { count: diffHour });

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return t('feedback.time.daysAgo', { count: diffDay });

    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
