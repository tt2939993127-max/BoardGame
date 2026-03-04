import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Calendar, DoorOpen, Filter, Lock, Unlock } from 'lucide-react';
import { cn } from '../../lib/utils';
import CustomSelect, { type Option } from './components/ui/CustomSelect';
import SearchInput from './components/ui/SearchInput';

interface RoomPlayer {
    id: number;
    name?: string;
    isConnected?: boolean;
}

interface RoomItem {
    id: string;
    matchID: string;
    gameName: string;
    roomName?: string;
    ownerKey?: string;
    ownerType?: 'user' | 'guest';
    ownerName?: string;
    isLocked: boolean;
    players: RoomPlayer[];
    createdAt: string;
    updatedAt: string;
}

const GAME_OPTIONS: Option[] = [
    { label: 'Dice Throne', value: 'dicethrone', icon: <DoorOpen size={14} /> },
    { label: 'Tic Tac Toe', value: 'tictactoe', icon: <DoorOpen size={14} /> },
    { label: 'Smash Up', value: 'smashup', icon: <DoorOpen size={14} /> },
    { label: 'Summoner Wars', value: 'summonerwars', icon: <DoorOpen size={14} /> },
];

export default function RoomsPage() {
    const { token } = useAuth();
    const { error: toastError, success } = useToast();
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameFilter, setGameFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAllFiltered, setSelectAllFiltered] = useState(false);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                gameName: gameFilter,
                search
            });
            const res = await fetch(`${ADMIN_API_URL}/rooms?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch rooms');
            const data = await res.json();
            const items = data.items.map((room: RoomItem) => ({ ...room, id: room.matchID }));
            setRooms(items);
            setTotalPages(Math.ceil(data.total / data.limit));
            setTotalItems(data.total);
        } catch (err) {
            console.error(err);
            toastError('获取房间列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, token, gameFilter, search]);

    useEffect(() => {
        if (selectAllFiltered) return;
        setSelectedIds((prev) => prev.filter((id) => rooms.some((room) => room.matchID === id)));
    }, [rooms, selectAllFiltered]);

    const allSelected = selectAllFiltered || (rooms.length > 0 && rooms.every((room) => selectedIds.includes(room.matchID)));

    const toggleSelectAll = () => {
        if (selectAllFiltered) {
            setSelectAllFiltered(false);
            setSelectedIds([]);
            return;
        }
        if (totalItems > rooms.length) {
            setSelectAllFiltered(true);
            setSelectedIds([]);
            return;
        }
        setSelectedIds(rooms.map((room) => room.matchID));
    };

    const toggleSelectOne = (matchID: string) => {
        if (selectAllFiltered) {
            setSelectAllFiltered(false);
            setSelectedIds([matchID]);
            return;
        }
        setSelectedIds((prev) => (
            prev.includes(matchID) ? prev.filter((id) => id !== matchID) : [...prev, matchID]
        ));
    };

    const handleDelete = async (matchID: string) => {
        if (!confirm('确定要删除该房间吗？')) return;
        try {
            const res = await fetch(`${ADMIN_API_URL}/rooms/${matchID}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                throw new Error(payload?.error || '删除失败');
            }
            success('房间已删除');
            fetchRooms();
        } catch (err) {
            console.error(err);
            toastError(err instanceof Error ? err.message : '删除失败');
        }
    };

    const handleBulkDelete = async () => {
        if (!selectAllFiltered && selectedIds.length === 0) return;
        const label = selectAllFiltered ? `当前筛选的 ${totalItems} 个房间` : `选中的 ${selectedIds.length} 个房间`;
        if (!confirm(`确定要删除${label}吗？`)) return;
        try {
            const url = selectAllFiltered
                ? `${ADMIN_API_URL}/rooms/bulk-delete-by-filter`
                : `${ADMIN_API_URL}/rooms/bulk-delete`;
            const payload = selectAllFiltered
                ? { gameName: gameFilter, search }
                : { ids: selectedIds };
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || '批量删除失败');
            }
            success(`已删除${label}`);
            setSelectedIds([]);
            setSelectAllFiltered(false);
            fetchRooms();
        } catch (err) {
            console.error(err);
            toastError(err instanceof Error ? err.message : '批量删除失败');
        }
    };

    const resolveOwnerLabel = (room: RoomItem) => {
        if (room.ownerName) return room.ownerName;
        if (room.ownerType === 'guest' && room.ownerKey) {
            return room.ownerKey.replace('guest:', '游客#');
        }
        return room.ownerKey || '未知';
    };

    const columns: Column<RoomItem>[] = [
        {
            header: (
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="选择全部房间"
                />
            ),
            width: '48px',
            className: 'text-center',
            cell: (room) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectAllFiltered || selectedIds.includes(room.matchID)}
                        onChange={() => toggleSelectOne(room.matchID)}
                        aria-label={`选择房间 ${room.matchID}`}
                    />
                </div>
            )
        },
        {
            header: '房间',
            cell: (room) => (
                <div>
                    <div className="font-semibold text-zinc-900">{room.roomName || '未命名房间'}</div>
                    <div className="text-xs font-mono text-zinc-400">{room.matchID.substring(0, 8)}</div>
                </div>
            )
        },
        {
            header: '游戏',
            accessorKey: 'gameName',
            cell: (room) => (
                <span className="capitalize text-zinc-700 font-medium">{room.gameName}</span>
            )
        },
        {
            header: '房主',
            cell: (room) => (
                <div className="text-xs text-zinc-500">
                    <div className="font-medium text-zinc-700">{resolveOwnerLabel(room)}</div>
                    <div className="uppercase text-[10px] text-zinc-400">{room.ownerType || 'guest'}</div>
                </div>
            )
        },
        {
            header: '状态',
            cell: (room) => (
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                    room.isLocked
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                    {room.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    {room.isLocked ? '有密码' : '公开'}
                </span>
            )
        },
        {
            header: '玩家',
            cell: (room) => {
                const total = room.players.length;
                const connected = room.players.filter((p) => p.isConnected).length;
                return (
                    <div className="text-xs text-zinc-500">
                        <div className="font-medium text-zinc-700">{connected}/{total || 0} 在线</div>
                        <div className="text-[10px] text-zinc-400">{total} 人在席</div>
                    </div>
                );
            }
        },
        {
            header: '更新时间',
            accessorKey: 'updatedAt',
            cell: (room) => (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
                    <Calendar size={12} className="opacity-70" />
                    {new Date(room.updatedAt).toLocaleString(undefined, {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    })}
                </div>
            )
        },
        {
            header: '操作',
            className: 'text-right',
            cell: (room) => (
                <div className="flex justify-end">
                    <button
                        onClick={() => handleDelete(room.matchID)}
                        className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                        删除
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 w-full max-w-[1600px] mx-auto min-h-0 bg-zinc-50/50">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 flex-none mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">房间管理</h1>
                    <p className="text-sm text-zinc-500 mt-1">查看所有房间状态并支持清理</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <SearchInput
                        placeholder="搜索房间ID或名称..."
                        onSearch={(val) => {
                            setSearch(val);
                            setPage(1);
                            setSelectedIds([]);
                            setSelectAllFiltered(false);
                        }}
                        className="w-full sm:w-64"
                    />
                    <CustomSelect
                        value={gameFilter}
                        onChange={(val) => {
                            setGameFilter(val);
                            setPage(1);
                            setSelectedIds([]);
                            setSelectAllFiltered(false);
                        }}
                        options={GAME_OPTIONS}
                        placeholder="所有游戏"
                        allOptionLabel="所有游戏"
                        prefixIcon={<Filter size={14} />}
                        className="w-full sm:w-48"
                    />
                    <button
                        onClick={handleBulkDelete}
                        disabled={!selectAllFiltered && selectedIds.length === 0}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        删除选中 {selectAllFiltered ? `(共 ${totalItems})` : selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                </div>
            </div>

            {selectAllFiltered && (
                <div className="flex items-center gap-2 mb-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    已全选当前筛选结果（{totalItems} 条）。如需取消，请点击表头的全选框。
                </div>
            )}

            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <DataTable
                    className="h-full border-none"
                    columns={columns}
                    data={rooms}
                    loading={loading}
                    pagination={{
                        currentPage: page,
                        totalPages,
                        onPageChange: setPage,
                        totalItems
                    }}
                />
            </div>
        </div>
    );
}
