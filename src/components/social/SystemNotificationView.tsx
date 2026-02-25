import { useEffect, useState } from 'react';
import { NOTIFICATION_API_URL } from '../../config/server';
import { useTranslation } from 'react-i18next';
import { Bell, Pin } from 'lucide-react';

interface SystemNotification {
    _id: string;
    title: string;
    content: string;
    pinned?: boolean;
    createdAt: string;
}

export const SystemNotificationView = () => {
    const { t } = useTranslation('social');
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        fetch(`${NOTIFICATION_API_URL}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => { if (active) setNotifications(data.notifications ?? []); })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <div className="flex flex-col h-full bg-parchment-card-bg">
            {/* 顶部栏 */}
            <div className="shrink-0 h-14 flex items-center px-4 border-b border-parchment-card-border/30 bg-parchment-base-bg">
                <Bell size={18} className="text-parchment-base-text" />
                <span className="ml-3 font-bold text-sm text-parchment-base-text">{t('notification.title')}</span>
            </div>

            {/* 通知列表 */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="text-center text-xs text-parchment-light-text py-8">{t('common:loading')}</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center text-parchment-light-text py-12 text-sm italic opacity-70">
                        {t('notification.empty')}
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        {notifications.map(n => (
                            <div
                                key={n._id}
                                className={`relative border rounded-lg p-4 shadow-sm overflow-hidden ${
                                    n.pinned
                                        ? 'bg-amber-50/80 border-amber-400/60 ring-1 ring-amber-300/40'
                                        : 'bg-white border-parchment-card-border/20'
                                }`}
                            >
                                {/* 置顶左侧色条 */}
                                {n.pinned && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-lg" />
                                )}
                                <div className="flex items-center gap-1.5">
                                    {n.pinned && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-700 mr-1">
                                            <Pin size={10} className="flex-shrink-0" />
                                            {t('notification.pinned', '置顶')}
                                        </span>
                                    )}
                                    <h4 className="font-bold text-sm text-parchment-base-text">{n.title}</h4>
                                </div>
                                <p className="text-xs text-parchment-light-text mt-1.5 whitespace-pre-wrap">{n.content}</p>
                                <p className="text-[10px] text-parchment-light-text/50 mt-2">
                                    {new Date(n.createdAt).toLocaleString('zh-CN')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
