import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import {
    CheckCircle, Circle, AlertTriangle, Lightbulb, HelpCircle,
    Gamepad2, Trash2, ChevronDown, ChevronRight, RefreshCw, Contact,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ImageLightbox from '../../components/common/ImageLightbox';

// ── 类型 ──

interface FeedbackItem {
    _id: string;
    userId: {
        _id: string;
        username: string;
        avatar?: string;
    };
    content: string;
    type: 'bug' | 'suggestion' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    gameName?: string;
    contactInfo?: string;
    createdAt: string;
}

// ── 常量 ──

const STATUS_OPTIONS = [
    { value: 'open', label: '待处理', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'in_progress', label: '处理中', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'resolved', label: '已解决', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'closed', label: '已关闭', color: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
] as const;

const TYPE_OPTIONS = [
    { value: 'bug', label: 'Bug', icon: AlertTriangle, iconColor: 'text-red-500' },
    { value: 'suggestion', label: '建议', icon: Lightbulb, iconColor: 'text-amber-500' },
    { value: 'other', label: '其他', icon: HelpCircle, iconColor: 'text-blue-500' },
] as const;

const SEVERITY_CONFIG: Record<string, { label: string; dot: string }> = {
    critical: { label: '严重', dot: 'bg-red-500' },
    high: { label: '高', dot: 'bg-orange-500' },
    medium: { label: '中', dot: 'bg-yellow-500' },
    low: { label: '低', dot: 'bg-green-500' },
};

const POLL_INTERVAL = 30_000; // 30 秒自动刷新

// ── 辅助组件 ──

/** 内联状态下拉选择器 */
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = STATUS_OPTIONS.find((s) => s.value === value) ?? STATUS_OPTIONS[0];

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border transition-colors cursor-pointer',
                    current.color
                )}
            >
                {current.label}
                <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 left-0 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 min-w-[100px]">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors',
                                opt.value === value ? 'font-semibold text-zinc-900' : 'text-zinc-600'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** 筛选标签按钮 */
function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                active
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            )}
        >
            {children}
        </button>
    );
}

// ── 主组件 ──

export default function AdminFeedbackPage() {
    const { token } = useAuth();
    const { success, error } = useToast();

    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    // 用于静默轮询（不显示 loading）
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const fetchFeedbacks = useCallback(async (silent = false) => {
        const requestId = ++requestIdRef.current;
        if (!silent) setLoading(true);
        if (silent) setIsPolling(true);
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);

            const res = await fetch(`${ADMIN_API_URL}/feedback?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('获取失败');
            const data = await res.json();
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setFeedbacks(data.items);
            }
        } catch {
            if (!silent) error('获取反馈列表失败');
        } finally {
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setLoading(false);
                setIsPolling(false);
            }
        }
    }, [token, statusFilter, typeFilter, error]);

    // 初始加载 + 筛选变更
    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    // 自动轮询
    useEffect(() => {
        const timer = setInterval(() => fetchFeedbacks(true), POLL_INTERVAL);
        return () => clearInterval(timer);
    }, [fetchFeedbacks]);

    // 清理已不存在的选中项
    useEffect(() => {
        setSelectedIds((prev) => {
            const ids = new Set<string>();
            prev.forEach((id) => { if (feedbacks.some((f) => f._id === id)) ids.add(id); });
            return ids.size === prev.size ? prev : ids;
        });
    }, [feedbacks]);

    // ── 选择逻辑 ──

    const allSelected = feedbacks.length > 0 && feedbacks.every((f) => selectedIds.has(f._id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(feedbacks.map((f) => f._id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // ── 操作 ──

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`${ADMIN_API_URL}/feedback/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('更新失败');
            setFeedbacks((prev) => prev.map((f) => (f._id === id ? { ...f, status: newStatus as FeedbackItem['status'] } : f)));
            success('状态已更新');
        } catch {
            error('更新状态失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除这条反馈？')) return;
        try {
            const res = await fetch(`${ADMIN_API_URL}/feedback/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('删除失败');
            setFeedbacks((prev) => prev.filter((f) => f._id !== id));
            setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
            success('已删除');
        } catch {
            error('删除失败');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`确定删除选中的 ${selectedIds.size} 条反馈？`)) return;
        try {
            const res = await fetch(`${ADMIN_API_URL}/feedback/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            if (!res.ok) throw new Error('批量删除失败');
            success('批量删除成功');
            setSelectedIds(new Set());
            fetchFeedbacks();
        } catch {
            error('批量删除失败');
        }
    };

    const changeFilter = (setter: (v: string) => void, value: string) => {
        setter(value);
        setSelectedIds(new Set());
        setExpandedId(null);
    };

    // ── 渲染 ──

    return (
        <div className="h-full flex flex-col p-6 w-full max-w-[1400px] mx-auto min-h-0">
            {/* 顶栏：标题 + 操作 */}
            <div className="flex items-center justify-between gap-4 flex-none mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-zinc-900">反馈管理</h1>
                    <span className="text-xs text-zinc-400">{feedbacks.length} 条</span>
                    <button
                        onClick={() => fetchFeedbacks()}
                        title="刷新"
                        className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <RefreshCw size={14} className={cn(isPolling && 'animate-spin')} />
                    </button>
                    {isPolling && <span className="text-[10px] text-zinc-400">更新中...</span>}
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                        >
                            <Trash2 size={12} />
                            删除 ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="flex items-center gap-4 flex-none mb-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 mr-1">状态</span>
                    {[{ value: 'all', label: '全部' }, ...STATUS_OPTIONS].map((opt) => (
                        <FilterTab
                            key={opt.value}
                            active={statusFilter === opt.value}
                            onClick={() => changeFilter(setStatusFilter, opt.value)}
                        >
                            {opt.label}
                        </FilterTab>
                    ))}
                </div>
                <div className="w-px h-4 bg-zinc-200" />
                <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 mr-1">类型</span>
                    <FilterTab active={typeFilter === 'all'} onClick={() => changeFilter(setTypeFilter, 'all')}>
                        全部
                    </FilterTab>
                    {TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                            <FilterTab key={opt.value} active={typeFilter === opt.value} onClick={() => changeFilter(setTypeFilter, opt.value)}>
                                <span className="flex items-center gap-1">
                                    <Icon size={12} className={opt.iconColor} />
                                    {opt.label}
                                </span>
                            </FilterTab>
                        );
                    })}
                </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="animate-spin text-zinc-300" size={24} />
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400 text-sm">暂无相关反馈</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-zinc-50">
                            <tr className="text-left text-xs text-zinc-400 font-medium">
                                <th className="w-8 py-2 px-2">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="rounded border-zinc-300"
                                        aria-label="全选"
                                    />
                                </th>
                                <th className="w-8 py-2" />
                                <th className="py-2 px-2">内容</th>
                                <th className="py-2 px-2 w-20">类型</th>
                                <th className="py-2 px-2 w-16">严重度</th>
                                <th className="py-2 px-2 w-24">状态</th>
                                <th className="py-2 px-2 w-24">提交者</th>
                                <th className="py-2 px-2 w-32">时间</th>
                                <th className="py-2 px-2 w-16" />
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.map((item) => {
                                const expanded = expandedId === item._id;
                                const typeOpt = TYPE_OPTIONS.find((t) => t.value === item.type);
                                const TypeIcon = typeOpt?.icon ?? HelpCircle;
                                const sevCfg = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.low;

                                return (
                                    <FeedbackRow
                                        key={item._id}
                                        item={item}
                                        expanded={expanded}
                                        selected={selectedIds.has(item._id)}
                                        TypeIcon={TypeIcon}
                                        typeOpt={typeOpt}
                                        sevCfg={sevCfg}
                                        onToggleExpand={() => setExpandedId(expanded ? null : item._id)}
                                        onToggleSelect={() => toggleSelect(item._id)}
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDelete}
                                        onImageClick={setPreviewImage}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
        </div>
    );
}

// ── 行组件（表格行 + 展开详情） ──

interface FeedbackRowProps {
    item: FeedbackItem;
    expanded: boolean;
    selected: boolean;
    TypeIcon: React.ElementType;
    typeOpt: (typeof TYPE_OPTIONS)[number] | undefined;
    sevCfg: { label: string; dot: string };
    onToggleExpand: () => void;
    onToggleSelect: () => void;
    onStatusUpdate: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    onImageClick: (src: string) => void;
}

function FeedbackRow({
    item, expanded, selected, TypeIcon, typeOpt, sevCfg,
    onToggleExpand, onToggleSelect, onStatusUpdate, onDelete, onImageClick,
}: FeedbackRowProps) {
    return (
        <>
            <tr
                onClick={onToggleExpand}
                className={cn(
                    'border-b border-zinc-50 cursor-pointer transition-colors group',
                    expanded ? 'bg-indigo-50/40' : 'hover:bg-zinc-50/80',
                    selected && 'bg-indigo-50/60'
                )}
            >
                {/* 选择框 */}
                <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        className="rounded border-zinc-300"
                        aria-label={`选择反馈 ${item._id}`}
                    />
                </td>

                {/* 展开箭头 */}
                <td className="py-2">
                    {expanded
                        ? <ChevronDown size={14} className="text-zinc-400" />
                        : <ChevronRight size={14} className="text-zinc-300" />
                    }
                </td>

                {/* 内容摘要 */}
                <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                        <p className={cn('truncate max-w-[400px]', expanded ? 'text-zinc-900 font-medium' : 'text-zinc-700')}>
                            {extractText(item.content)}
                        </p>
                        {hasEmbeddedImage(item.content) && (
                            <ImageIcon size={14} className="text-zinc-400 flex-shrink-0" />
                        )}
                    </div>
                </td>

                {/* 类型 */}
                <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                        <TypeIcon size={12} className={typeOpt?.iconColor ?? 'text-zinc-400'} />
                        {typeOpt?.label ?? item.type}
                    </span>
                </td>

                {/* 严重度 */}
                <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                        <span className={cn('w-2 h-2 rounded-full', sevCfg.dot)} />
                        {sevCfg.label}
                    </span>
                </td>

                {/* 状态 */}
                <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect value={item.status} onChange={(v) => onStatusUpdate(item._id, v)} />
                </td>

                {/* 提交者 */}
                <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden flex-shrink-0">
                            {item.userId.avatar
                                ? <img src={item.userId.avatar} alt="" className="w-full h-full object-cover" />
                                : item.userId.username?.[0]?.toUpperCase()
                            }
                        </div>
                        <span className="text-xs text-zinc-600 truncate max-w-[80px]">{item.userId.username}</span>
                    </div>
                </td>

                {/* 时间 */}
                <td className="py-2 px-2 text-xs text-zinc-400 tabular-nums">
                    {formatTime(item.createdAt)}
                </td>

                {/* 操作 */}
                <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onStatusUpdate(item._id, item.status === 'resolved' ? 'open' : 'resolved')}
                            className="p-1 rounded hover:bg-zinc-100 transition-colors"
                            title={item.status === 'resolved' ? '重新打开' : '标记已解决'}
                        >
                            {item.status === 'resolved'
                                ? <Circle size={14} className="text-zinc-400" />
                                : <CheckCircle size={14} className="text-emerald-500" />
                            }
                        </button>
                        <button
                            onClick={() => onDelete(item._id)}
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            title="删除"
                        >
                            <Trash2 size={14} className="text-zinc-300 hover:text-red-500" />
                        </button>
                    </div>
                </td>
            </tr>

            {/* 展开详情 */}
            <AnimatePresence>
                {expanded && (
                    <tr>
                        <td colSpan={9} className="p-0">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                            >
                                <div className="px-10 py-4 bg-zinc-50/50 border-b border-zinc-100">
                                    <FeedbackContent content={item.content} onImageClick={onImageClick} />
                                    <div className="flex items-center gap-4 text-xs text-zinc-400 mt-3">
                                        {item.gameName && (
                                            <span className="inline-flex items-center gap-1">
                                                <Gamepad2 size={12} />
                                                {item.gameName}
                                            </span>
                                        )}
                                        {item.contactInfo && (
                                            <span className="inline-flex items-center gap-1">
                                                <Contact size={12} />
                                                {item.contactInfo}
                                            </span>
                                        )}
                                        <span>ID: {item._id}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    );
}

// ── 内容解析与渲染 ──

/** 匹配 Markdown 内嵌图片：![alt](data:image/...) */
const EMBEDDED_IMG_RE = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;

/** 提取纯文本（去掉内嵌图片的 Markdown） */
function extractText(content: string): string {
    return content.replace(EMBEDDED_IMG_RE, '').trim() || '（仅图片）';
}

/** 是否包含内嵌图片 */
function hasEmbeddedImage(content: string): boolean {
    return EMBEDDED_IMG_RE.test(content);
}

/** 将 content 中的文本和内嵌图片分别渲染 */
function FeedbackContent({ content, onImageClick }: { content: string; onImageClick: (src: string) => void }) {
    // 重置 lastIndex（全局正则需要）
    EMBEDDED_IMG_RE.lastIndex = 0;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = EMBEDDED_IMG_RE.exec(content)) !== null) {
        // 图片前的文本
        if (match.index > lastIndex) {
            const text = content.slice(lastIndex, match.index).trim();
            if (text) {
                parts.push(
                    <p key={key++} className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                        {text}
                    </p>
                );
            }
        }
        // 图片 — 点击打开灯箱预览
        const imgSrc = match[2];
        parts.push(
            <button
                key={key++}
                type="button"
                onClick={(e) => { e.stopPropagation(); onImageClick(imgSrc); }}
                className="block text-left"
            >
                <img
                    src={imgSrc}
                    alt={match[1] || '截图'}
                    className="max-w-md max-h-64 rounded-lg border border-zinc-200 object-contain bg-white cursor-zoom-in hover:shadow-md transition-shadow"
                />
            </button>
        );
        lastIndex = match.index + match[0].length;
    }

    // 剩余文本
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
        parts.push(
            <p key={key++} className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                {remaining}
            </p>
        );
    }

    if (parts.length === 0) {
        parts.push(
            <p key={0} className="text-sm text-zinc-400 italic">（无内容）</p>
        );
    }

    return <div className="space-y-3 mb-3">{parts}</div>;
}

// ── 工具函数 ──

function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} 天前`;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
