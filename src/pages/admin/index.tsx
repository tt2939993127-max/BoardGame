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
            color: "text-blue-600 bg-blue-50"
        },
        {
            title: "24h 活跃用户",
            value: stats?.activeUsers24h ?? '-',
            icon: <Activity size={24} />,
            color: "text-green-600 bg-green-50"
        },
        {
            title: "总对局数",
            value: stats?.totalMatches ?? '-',
            icon: <Gamepad2 size={24} />,
            color: "text-purple-600 bg-purple-50"
        },
        {
            title: "被封禁用户",
            value: stats?.bannedUsers ?? '-',
            icon: <ShieldAlert size={24} />,
            color: "text-red-600 bg-red-50"
        }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((item, index) => (
                    <StatsCard
                        key={index}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        loading={loading}
                    />
                ))}
            </div>
        </div>
    );
}
