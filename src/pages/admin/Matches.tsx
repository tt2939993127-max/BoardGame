import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Filter } from 'lucide-react';
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
            cell: (m) => <span className="font-mono text-xs">{m.matchID.substring(0, 8)}...</span>
        },
        {
            header: '游戏',
            accessorKey: 'gameName',
            cell: (m) => (
                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                    {m.gameName}
                </span>
            )
        },
        {
            header: '玩家',
            cell: (m) => (
                <div className="flex -space-x-2">
                    {m.players.map((p, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] overflow-hidden" title={p.name || p.id}>
                            {p.avatar ? (
                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{(p.name || '?')[0]}</span>
                            )}
                        </div>
                    ))}
                    <span className="ml-4 text-xs text-slate-500 self-center">
                        {m.players.length} 人
                    </span>
                </div>
            )
        },
        {
            header: '状态',
            cell: (m) => (
                <span className={cn(
                    "px-2 py-1 text-xs rounded-full font-medium",
                    m.gameover ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
                )}>
                    {m.gameover ? '已结束' : '进行中'}
                </span>
            )
        },
        {
            header: '创建时间',
            accessorKey: 'createdAt',
            cell: (m) => new Date(m.createdAt).toLocaleString()
        },
        {
            header: '操作',
            cell: () => (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">TODO: Details</span>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">对局记录</h1>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        value={gameFilter}
                        onChange={(e) => setGameFilter(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
