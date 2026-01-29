import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Filter, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    createdAt: string;
    updatedAt: string;
    gameover?: unknown;
}

export default function MatchesPage() {
    const { token } = useAuth();
    const { error: toastError } = useToast();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameFilter, setGameFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                gameName: gameFilter
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

    useEffect(() => {
        fetchMatches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, token, gameFilter]);

    const columns: Column<Match>[] = [
        {
            header: 'ID',
            accessorKey: 'matchID',
            cell: (m) => <span className="font-mono text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{m.matchID.substring(0, 8)}</span>
        },
        {
            header: '游戏',
            accessorKey: 'gameName',
            cell: (m) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        m.gameName === 'dicethrone' ? "bg-orange-500" : "bg-blue-500"
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
                    <div className="flex -space-x-3">
                        {m.players.map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white overflow-hidden" title={p.name || p.id}>
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
            header: '状态',
            cell: (m) => (
                <span className={cn(
                    "px-2.5 py-1 text-xs rounded-full font-semibold border",
                    m.gameover
                        ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                        : "bg-green-50 text-green-700 border-green-200"
                )}>
                    {m.gameover ? '已结束' : '进行中'}
                </span>
            )
        },
        {
            header: '创建时间',
            accessorKey: 'createdAt',
            cell: (m) => (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Calendar size={12} />
                    {new Date(m.createdAt).toLocaleString()}
                </div>
            )
        },
        {
            header: '操作',
            className: 'text-right',
            cell: () => (
                <div className="flex justify-end">
                    <button disabled className="text-xs font-medium text-zinc-400 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        查看详情
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">对局记录</h1>
                    <p className="text-sm text-zinc-500 mt-1">查看平台所有对局历史与状态</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="px-3 flex items-center gap-2 text-zinc-500 border-r border-zinc-100">
                        <Filter size={16} />
                        <span className="text-xs font-medium uppercase tracking-wider">Filter</span>
                    </div>
                    <select
                        value={gameFilter}
                        onChange={(e) => setGameFilter(e.target.value)}
                        className="bg-transparent text-sm font-medium text-zinc-700 focus:outline-none cursor-pointer pr-8 pl-2 py-1"
                    >
                        <option value="">所有游戏</option>
                        <option value="dicethrone">Dice Throne</option>
                        <option value="tictactoe">Tic Tac Toe</option>
                    </select>
                </div>
            </div>

            <DataTable
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
    );
}
