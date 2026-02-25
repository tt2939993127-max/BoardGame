import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Filter, Calendar, Gamepad2, X, ScrollText, Copy, Check, Swords, Shield, Dices, CreditCard, ArrowRight, Heart, Zap, Sparkles, CircleDot } from 'lucide-react';
import { cn } from '../../lib/utils';
import CustomSelect, { type Option } from './components/ui/CustomSelect';
import SearchInput from './components/ui/SearchInput';
import i18n from '../../lib/i18n';
import { formatActionLogSegments } from '../../components/game/utils/actionLogFormat';

interface MatchPlayer {
    id: string;
    name: string;
    avatar?: string;
}

interface Match {
    id: string;
    matchID: string;
    gameName: string;
    players: MatchPlayer[];
    winnerID?: string;
    createdAt: string;
    endedAt: string;
    updatedAt: string;
}

/** ActionLog segment（与引擎 ActionLogSegment 对齐） */
interface ActionLogSegment {
    type: 'text' | 'i18n' | 'breakdown' | 'card' | 'diceResult';
    text?: string;
    key?: string;
    ns?: string;
    params?: Record<string, string | number>;
    paramI18nKeys?: string[];
    label?: string;
    value?: number;
    unit?: string;
    // card segment
    cardId?: string;
    previewText?: string;
    previewTextNs?: string;
    // diceResult segment
    dice?: Array<{ value: number; col: number; row: number }>;
    // breakdown segment
    displayText?: string;
    lines?: Array<{ label: string; value: number; unit?: string }>;
}

interface ActionLogEntry {
    id: string;
    timestamp: number;
    actorId: string;
    kind: string;
    segments: ActionLogSegment[];
}

interface MatchDetail {
    matchID: string;
    gameName: string;
    players: Array<MatchPlayer & { result?: string; userId?: string | null }>;
    winnerID?: string;
    actionLog?: ActionLogEntry[];
    createdAt: string;
    endedAt: string;
    duration: number;
}

const GAME_OPTIONS: Option[] = [
    { label: 'Dice Throne', value: 'dicethrone', icon: <Gamepad2 size={14} /> },
    { label: 'Tic Tac Toe', value: 'tictactoe', icon: <Gamepad2 size={14} /> },
    { label: 'Smash Up', value: 'smashup', icon: <Gamepad2 size={14} /> },
    { label: 'Summoner Wars', value: 'summonerwars', icon: <Gamepad2 size={14} /> },
];

export default function MatchesPage() {
    const { token } = useAuth();
    const { error: toastError, success } = useToast();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameFilter, setGameFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [detailMatch, setDetailMatch] = useState<MatchDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchMatchDetail = useCallback(async (matchID: string) => {
        if (!token) return;
        setDetailLoading(true);
        try {
            const res = await fetch(`${ADMIN_API_URL}/matches/${matchID}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('获取详情失败');
            const data = await res.json();
            setDetailMatch(data);
        } catch (err) {
            console.error(err);
            toastError('获取对局详情失败');
        } finally {
            setDetailLoading(false);
        }
    }, [token, toastError]);

    const fetchMatches = async () => {
        if (!token) {
            setMatches([]);
            setTotalPages(1);
            setTotalItems(0);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                gameName: gameFilter,
                search
            });
            const res = await fetch(`${ADMIN_API_URL}/matches?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data = await res.json();
            const items = data.items.map((m: Match) => ({ ...m, id: m.matchID }));
            setMatches(items);
            setTotalPages(Math.ceil(data.total / data.limit));
            setTotalItems(data.total);
        } catch (err) {
            console.error(err);
            toastError('获取对局列表失败');
        } finally {
            setLoading(false);
        }
    };

    const resolveResultLabel = (match: Match) => {
        if (!match.winnerID) return '平局';
        const winner = match.players.find((player) => player.id === match.winnerID);
        return `${winner?.name || `玩家${match.winnerID}`} 胜`;
    };

    const formatDuration = (start: string, end: string) => {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        if (Number.isNaN(startTime) || Number.isNaN(endTime)) return '耗时未知';
        const diffSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        if (hours > 0) return `耗时 ${hours}小时${minutes}分`;
        if (minutes > 0) return `耗时 ${minutes}分${seconds}秒`;
        return `耗时 ${seconds}秒`;
    };

    useEffect(() => {
        fetchMatches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, token, gameFilter, search]);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => matches.some((m) => m.matchID === id)));
    }, [matches]);

    const allSelected = matches.length > 0 && matches.every((m) => selectedIds.includes(m.matchID));

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : matches.map((m) => m.matchID));
    };

    const toggleSelectOne = (matchID: string) => {
        setSelectedIds((prev) => (
            prev.includes(matchID) ? prev.filter((id) => id !== matchID) : [...prev, matchID]
        ));
    };

    const handleDelete = async (matchID: string) => {
        if (!confirm('确定要删除该对局记录吗？')) return;
        try {
            const res = await fetch(`${ADMIN_API_URL}/matches/${matchID}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                throw new Error(payload?.error || '删除失败');
            }
            success('对局记录已删除');
            fetchMatches();
        } catch (err) {
            console.error(err);
            toastError(err instanceof Error ? err.message : '删除失败');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedIds.length} 条对局记录吗？`)) return;
        try {
            const res = await fetch(`${ADMIN_API_URL}/matches/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                throw new Error(payload?.error || '批量删除失败');
            }
            success(`已删除 ${selectedIds.length} 条对局记录`);
            setSelectedIds([]);
            fetchMatches();
        } catch (err) {
            console.error(err);
            toastError(err instanceof Error ? err.message : '批量删除失败');
        }
    };

    const columns: Column<Match>[] = [
        {
            header: (
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="选择全部对局"
                />
            ),
            width: '48px',
            align: 'center',
            cell: (m) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(m.matchID)}
                        onChange={() => toggleSelectOne(m.matchID)}
                        aria-label={`选择对局 ${m.matchID}`}
                    />
                </div>
            )
        },
        {
            header: 'ID',
            accessorKey: 'matchID',
            cell: (m) => <span className="font-mono text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">{m.matchID.substring(0, 8)}</span>
        },
        {
            header: '游戏',
            accessorKey: 'gameName',
            cell: (m) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        m.gameName === 'dicethrone' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" :
                            m.gameName === 'smashup' ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" :
                                "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                    )} />
                    <span className="font-medium text-zinc-700 capitalize">
                        {m.gameName}
                    </span>
                </div>
            )
        },
        {
            header: '玩家',
            cell: (m) => (
                <div className="flex items-center gap-3">
                    {/* Fixed: Removed hover:space-x-1 to prevent layout jitter */}
                    <div className="flex -space-x-3">
                        {m.players.map((p, i) => (
                            // Fixed: Removed hover:scale-110 and hover:z-10
                            <div key={i} className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white overflow-hidden shadow-sm relative z-0" title={p.name || p.id}>
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-400">
                                        {(p.name || '?')[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            header: '结果',
            align: 'center',
            cell: (m) => (
                <div className="flex justify-center">
                    <span className={cn(
                        "px-2.5 py-1 text-xs rounded-full font-semibold border flex w-fit items-center gap-1.5",
                        m.winnerID ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", m.winnerID ? "bg-emerald-400" : "bg-zinc-400")} />
                        {resolveResultLabel(m)}
                    </span>
                </div>
            )
        },
        {
            header: '结束时间',
            accessorKey: 'endedAt',
            align: 'right', // New alignment
            className: 'custom-date-col',
            cell: (m) => (
                <div className="flex flex-col gap-1 text-zinc-500 text-xs font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                        <Calendar size={12} className="opacity-70" />
                        {new Date(m.endedAt).toLocaleString(undefined, {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        })}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-sans">
                        {formatDuration(m.createdAt, m.endedAt)}
                    </span>
                </div>
            )
        },
        {
            header: '操作',
            align: 'right', // New alignment
            cell: (m) => (
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => handleDelete(m.matchID)}
                        className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                        删除
                    </button>
                    <button
                        onClick={() => fetchMatchDetail(m.matchID)}
                        className="text-xs font-medium text-zinc-500 hover:text-indigo-600 transition-colors"
                    >
                        详情
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 w-full max-w-[1600px] mx-auto min-h-0 bg-zinc-50/50">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 flex-none mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">对局记录</h1>
                    <p className="text-sm text-zinc-500 mt-1">查看平台所有对局历史与状态</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <SearchInput
                        placeholder="搜索对局ID或玩家..."
                        onSearch={(val) => { setSearch(val); setPage(1); }}
                        className="w-full sm:w-64"
                    />
                    <CustomSelect
                        value={gameFilter}
                        onChange={(val) => { setGameFilter(val); setPage(1); }}
                        options={GAME_OPTIONS}
                        placeholder="所有游戏"
                        allOptionLabel="所有游戏"
                        prefixIcon={<Filter size={14} />}
                        className="w-full sm:w-48"
                    />
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        删除选中 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <DataTable
                    className="h-full border-none"
                    columns={columns}
                    data={matches}
                    loading={loading}
                    pagination={{
                        currentPage: page,
                        totalPages,
                        onPageChange: setPage,
                        totalItems
                    }}
                />
            </div>

            {/* 对局详情弹窗 */}
            {detailMatch && (
                <MatchDetailModal
                    detail={detailMatch}
                    loading={detailLoading}
                    onClose={() => setDetailMatch(null)}
                />
            )}
        </div>
    );
}


// ── 游戏名称映射 ──

const GAME_NAME_MAP: Record<string, string> = {
    dicethrone: '王权骰铸',
    smashup: '大杀四方',
    summonerwars: '召唤师战争',
    tictactoe: '井字棋',
};

// ── 操作日志 segment 渲染（i18n 感知） ──

/**
 * 将 segment 渲染为人类可读的 React 节点。
 * 如果 i18n namespace 已加载，则翻译 i18n segment；否则 fallback 到 key + params。
 */
function renderSegmentFriendly(
    seg: ActionLogSegment,
    idx: number,
    playerNameMap: Map<string, string>,
): React.ReactNode {
    switch (seg.type) {
        case 'text':
            return <span key={idx}>{seg.text}</span>;
        case 'i18n': {
            const ns = seg.ns || '';
            const key = seg.key || '';
            // 先解析 paramI18nKeys（值本身是同 ns 下的 i18n key）
            const resolvedParams: Record<string, string | number> = { ...seg.params };
            if (seg.paramI18nKeys) {
                for (const paramKey of seg.paramI18nKeys) {
                    const rawValue = resolvedParams[paramKey];
                    if (typeof rawValue === 'string' && rawValue) {
                        resolvedParams[paramKey] = i18n.t(`${ns}:${rawValue}`, { defaultValue: rawValue });
                    }
                }
            }
            // 将玩家 ID 替换为玩家名
            for (const [pKey, pVal] of Object.entries(resolvedParams)) {
                if ((pKey === 'playerId' || pKey.endsWith('PlayerId')) && (typeof pVal === 'string' || typeof pVal === 'number')) {
                    const name = playerNameMap.get(String(pVal));
                    if (name) resolvedParams[pKey] = name;
                }
            }
            const translated = i18n.t(`${ns}:${key}`, { ...resolvedParams, defaultValue: '' });
            // 如果翻译成功（不为空且不等于 key 本身），显示翻译结果
            if (translated && translated !== key && translated !== `${ns}:${key}`) {
                return <span key={idx}>{translated}</span>;
            }
            // fallback：显示 key + params
            return (
                <span key={idx} className="text-indigo-600" title={`${ns}:${key}`}>
                    {key}{seg.params ? `(${JSON.stringify(seg.params)})` : ''}
                </span>
            );
        }
        case 'breakdown':
            return (
                <span key={idx} className="font-semibold text-amber-700" title={seg.lines?.map(l => `${l.label}: ${l.value}${l.unit ?? ''}`).join('\n')}>
                    {seg.displayText}
                </span>
            );
        case 'card': {
            const ns = seg.previewTextNs || '';
            const rawText = seg.previewText || seg.cardId || '';
            const displayText = ns ? i18n.t(`${ns}:${rawText}`, { defaultValue: rawText }) : rawText;
            return (
                <span key={idx} className="text-violet-600 font-medium">
                    【{displayText}】
                </span>
            );
        }
        case 'diceResult': {
            const values = seg.dice?.map(d => d.value) ?? [];
            return (
                <span key={idx} className="inline-flex items-center gap-0.5">
                    {values.map((v, di) => (
                        <span key={di} className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-800 text-white text-[10px] font-bold">
                            {v}
                        </span>
                    ))}
                </span>
            );
        }
        default:
            return <span key={idx} className="text-zinc-400">{JSON.stringify(seg)}</span>;
    }
}

/**
 * 根据 entry.kind 返回对应的图标和颜色
 */
function getEntryIcon(kind: string): { icon: React.ReactNode; color: string } {
    if (kind.includes('damage') || kind.includes('attack') || kind.includes('combat'))
        return { icon: <Swords size={12} />, color: 'text-red-500' };
    if (kind.includes('defense') || kind.includes('defend'))
        return { icon: <Shield size={12} />, color: 'text-blue-500' };
    if (kind.includes('roll') || kind.includes('dice'))
        return { icon: <Dices size={12} />, color: 'text-purple-500' };
    if (kind.includes('card') || kind.includes('play') || kind.includes('discard'))
        return { icon: <CreditCard size={12} />, color: 'text-amber-500' };
    if (kind.includes('phase') || kind.includes('advance'))
        return { icon: <ArrowRight size={12} />, color: 'text-zinc-400' };
    if (kind.includes('heal'))
        return { icon: <Heart size={12} />, color: 'text-emerald-500' };
    if (kind.includes('ability') || kind.includes('skill'))
        return { icon: <Zap size={12} />, color: 'text-yellow-500' };
    if (kind.includes('status') || kind.includes('token') || kind.includes('buff'))
        return { icon: <Sparkles size={12} />, color: 'text-cyan-500' };
    return { icon: <CircleDot size={12} />, color: 'text-zinc-400' };
}

/**
 * 将 segments 转为纯文本（用于复制），复用已有的 formatActionLogSegments 工具函数。
 * 同时将玩家 ID 替换为玩家名。
 */
function segmentsToPlainText(
    segments: ActionLogSegment[],
    playerNameMap: Map<string, string>,
): string {
    // 先替换玩家 ID
    const resolved = segments.map((seg) => {
        if (seg.type !== 'i18n' || !seg.params) return seg;
        let changed = false;
        const newParams: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(seg.params)) {
            if ((key === 'playerId' || key.endsWith('PlayerId')) && (typeof value === 'string' || typeof value === 'number')) {
                const name = playerNameMap.get(String(value));
                if (name) { newParams[key] = name; changed = true; continue; }
            }
            newParams[key] = value;
        }
        return changed ? { ...seg, params: newParams } : seg;
    });
    // 复用引擎层的格式化函数（会自动翻译 i18n segment）
    return formatActionLogSegments(resolved as import('../../engine/types').ActionLogSegment[]);
}

/**
 * 生成 AI 友好的对局摘要文本
 */
function buildAIFriendlyText(detail: MatchDetail): string {
    const gameName = GAME_NAME_MAP[detail.gameName] || detail.gameName;
    const playerNameMap = new Map<string, string>();
    detail.players.forEach(p => {
        playerNameMap.set(p.id, p.name || `玩家${p.id}`);
    });

    const lines: string[] = [];
    lines.push(`# 对局记录`);
    lines.push(`- 游戏: ${gameName}`);
    lines.push(`- 对局ID: ${detail.matchID}`);
    lines.push(`- 耗时: ${formatDurationText(detail.duration)}`);
    lines.push(`- 结束时间: ${new Date(detail.endedAt).toLocaleString()}`);
    lines.push('');

    // 玩家信息
    lines.push(`## 玩家`);
    detail.players.forEach(p => {
        const name = p.name || `玩家${p.id}`;
        const result = !detail.winnerID ? '平局' : (p.id === detail.winnerID ? '胜利' : '失败');
        lines.push(`- ${name} (P${p.id}): ${result}`);
    });
    lines.push('');

    // 操作日志
    if (detail.actionLog && detail.actionLog.length > 0) {
        lines.push(`## 操作日志 (${detail.actionLog.length}条)`);
        detail.actionLog.forEach((entry, i) => {
            const playerName = playerNameMap.get(String(entry.actorId)) || `P${entry.actorId}`;
            const text = segmentsToPlainText(entry.segments, playerNameMap) || entry.kind;
            lines.push(`${i + 1}. [${playerName}] ${text}`);
        });
    }

    return lines.join('\n');
}

function formatDurationText(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
}

// ── 对局详情弹窗 ──

function MatchDetailModal({
    detail,
    loading,
    onClose,
}: {
    detail: MatchDetail;
    loading: boolean;
    onClose: () => void;
}) {
    const [i18nReady, setI18nReady] = useState(() => {
        const ns = `game-${detail.gameName}`;
        return i18n.hasLoadedNamespace(ns);
    });
    const [copied, setCopied] = useState(false);

    // 动态加载游戏 i18n namespace
    useEffect(() => {
        if (i18nReady) return;
        const ns = `game-${detail.gameName}`;
        i18n.loadNamespaces(ns).then(() => setI18nReady(true)).catch(() => setI18nReady(true));
    }, [detail.gameName, i18nReady]);

    // 玩家 ID → 名称映射
    const playerNameMap = useMemo(() => {
        const map = new Map<string, string>();
        detail.players.forEach(p => {
            map.set(p.id, p.name || `玩家${p.id}`);
        });
        return map;
    }, [detail.players]);

    const resolveResult = (playerId: string) => {
        if (!detail.winnerID) return '平局';
        return playerId === detail.winnerID ? '胜利' : '失败';
    };

    const handleCopyForAI = async () => {
        const text = buildAIFriendlyText(detail);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const gameName = GAME_NAME_MAP[detail.gameName] || detail.gameName;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">对局详情</h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{detail.matchID}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12 text-zinc-400">加载中...</div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* 基础信息 */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-zinc-400 text-xs">游戏</span>
                                <p className="font-medium text-zinc-700 mt-0.5">{gameName}</p>
                            </div>
                            <div>
                                <span className="text-zinc-400 text-xs">耗时</span>
                                <p className="font-medium text-zinc-700 mt-0.5">{formatDurationText(detail.duration)}</p>
                            </div>
                            <div>
                                <span className="text-zinc-400 text-xs">结束时间</span>
                                <p className="font-medium text-zinc-700 mt-0.5">
                                    {new Date(detail.endedAt).toLocaleString(undefined, {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* 玩家 */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">玩家</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {detail.players.map((p, i) => (
                                    <div key={i} className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border",
                                        p.id === detail.winnerID
                                            ? "bg-emerald-50 border-emerald-200"
                                            : "bg-zinc-50 border-zinc-200"
                                    )}>
                                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">
                                            {(p.name || '?')[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-700 truncate">{p.name || `玩家${p.id}`}</p>
                                            <p className={cn(
                                                "text-xs font-semibold",
                                                p.id === detail.winnerID ? "text-emerald-600" : "text-zinc-400"
                                            )}>
                                                {resolveResult(p.id)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 操作日志 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <ScrollText size={12} />
                                    操作日志
                                    {detail.actionLog && (
                                        <span className="text-zinc-300 font-normal">({detail.actionLog.length})</span>
                                    )}
                                </h4>
                                {detail.actionLog && detail.actionLog.length > 0 && (
                                    <button
                                        onClick={handleCopyForAI}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                                            copied
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                : "bg-zinc-100 text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 border border-zinc-200 hover:border-indigo-200"
                                        )}
                                        title="复制为 AI 可读的纯文本格式"
                                    >
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                        {copied ? '已复制' : '复制给 AI'}
                                    </button>
                                )}
                            </div>
                            {!i18nReady && detail.actionLog && detail.actionLog.length > 0 && (
                                <p className="text-xs text-zinc-400">加载翻译中...</p>
                            )}
                            {detail.actionLog && detail.actionLog.length > 0 ? (
                                <div className="bg-zinc-50 rounded-xl border border-zinc-200 divide-y divide-zinc-100 max-h-96 overflow-y-auto">
                                    {detail.actionLog.map((entry, i) => {
                                        const playerName = playerNameMap.get(String(entry.actorId)) || `P${entry.actorId}`;
                                        const { icon, color } = getEntryIcon(entry.kind);
                                        return (
                                            <div key={entry.id || i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-zinc-100/50 transition-colors">
                                                <span className="text-[10px] text-zinc-300 font-mono shrink-0 mt-1 w-6 text-right">{i + 1}</span>
                                                <span className={cn("shrink-0 mt-0.5", color)}>{icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap text-zinc-700 leading-relaxed">
                                                        {i18nReady
                                                            ? entry.segments.map((seg, si) => renderSegmentFriendly(seg, si, playerNameMap))
                                                            : <span className="text-zinc-400 italic">{entry.kind}</span>
                                                        }
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 font-medium shrink-0 mt-0.5 bg-zinc-200/60 px-1.5 py-0.5 rounded">
                                                    {playerName}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 italic">暂无操作日志</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
