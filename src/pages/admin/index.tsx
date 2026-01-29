import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from './components/StatsCard';
import { Users, Gamepad2, Activity, ShieldAlert } from 'lucide-react';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';

interface DashboardStats {
    totalUsers: number;
    totalMatches: number;
    activeUsers24h: number;
    bannedUsers: number;
}

export default function AdminDashboard() {
    const { token } = useAuth();
    const { error } = useToast();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${ADMIN_API_URL}/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                error('获取统计数据失败');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const statItems = [
        {
            title: "总用户数",
            value: stats?.totalUsers ?? '-',
            icon: <Users size={24} />,
            color: "text-indigo-600 bg-indigo-50"
        },
        {
            title: "24h 活跃用户",
            value: stats?.activeUsers24h ?? '-',
            icon: <Activity size={24} />,
            color: "text-emerald-600 bg-emerald-50",
            trend: {
                value: 12, // Mock trend for premium feel visual
                isPositive: true,
                label: "vs yesterday"
            }
        },
        {
            title: "总对局数",
            value: stats?.totalMatches ?? '-',
            icon: <Gamepad2 size={24} />,
            color: "text-violet-600 bg-violet-50"
        },
        {
            title: "被封禁用户",
            value: stats?.bannedUsers ?? '-',
            icon: <ShieldAlert size={24} />,
            color: "text-rose-600 bg-rose-50"
        }
    ];

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">概览</h1>
                <p className="text-zinc-500 mt-1">欢迎回来，这里是您的平台运营状态概览。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((item, index) => (
                    <StatsCard
                        key={index}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        trend={item.trend}
                        loading={loading}
                    />
                ))}
            </div>

            {/* Placeholder for future charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50 min-h-[300px] flex items-center justify-center text-zinc-400 font-medium border-dashed">
                    用户增长趋势 (Coming Soon)
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50 min-h-[300px] flex items-center justify-center text-zinc-400 font-medium border-dashed">
                    游戏活跃度分布 (Coming Soon)
                </div>
            </div>
        </div>
    );
}
