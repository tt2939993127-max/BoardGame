import { useEffect, useRef, useState } from 'react';
import { useSocial } from '../../contexts/SocialContext';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { Message } from '../../types/social';
import { socialSocket, SOCIAL_EVENTS, type NewMessagePayload } from '../../services/socialSocket';

interface ChatWindowProps {
    targetUserId: string;
    inviteData?: {
        matchId: string;
        gameName: string; // Use gameName to match GameHUD prop naming standard
    };
}

export const ChatWindow = ({ targetUserId, inviteData }: ChatWindowProps) => {
    const { friends, sendMessage, getMessages, markAsRead, conversations } = useSocial();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation(['social', 'common']);

    const friend = friends.find(f => f.id === targetUserId);
    const conversation = conversations.find(c => c.userId === targetUserId);

    // Initial Load & Polling/Update
    // Actually SocialContext should handle live updates via socket events pushing to `conversations` or a global message store.
    // The current SocialContext implementation only updates `conversations` list (last message).
    // It does NOT update a full message history store.
    // So distinct message history needs to be fetched or updated via event listener here or in context.
    // The `useSocial` context emits events or updates a store?
    // In my `SocialContext` implementation:
    // `const handleNewMessage` -> `refreshConversations`. It does NOT store the full message content in a map.
    // So this component needs to listen to NEW_MESSAGE event too? Or `SocialContext` should expose an event emitter?
    // `SocialContext` exposes `socialSocket`. We can listen to it directly or via context helper.
    // But `getMessages` fetches history.

    // Better approach:
    // `SocialContext` manages `messageStore: Map<userId, Message[]>`.
    // But for now, I will just re-fetch or listen to socket here.
    // Since `SocialContext` already listens to socket, I can add a listener here too.

    useEffect(() => {
        let active = true;
        setLoading(true);
        getMessages(targetUserId).then(msgs => {
            if (active) {
                setMessages(msgs);
                setLoading(false);
                scrollToBottom();
                markAsRead(targetUserId);
            }
        });

        return () => { active = false; };
    }, [targetUserId, getMessages, markAsRead]);

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (payload: NewMessagePayload) => {
            // Only add if it belongs to this conversation
            if (payload.from === targetUserId || (payload.to === targetUserId && payload.from === user?.id)) {
                const newMsg: Message = {
                    id: payload.id,
                    from: payload.from,
                    to: payload.to, // currently me
                    content: payload.content,
                    type: payload.type,
                    read: false,
                    createdAt: payload.createdAt
                };

                setMessages(prev => {
                    // Deduplicate
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });

                if (payload.from === targetUserId) {
                    markAsRead(targetUserId);
                }
                setTimeout(scrollToBottom, 100);
            }
        };

        const cleanup = socialSocket.on(SOCIAL_EVENTS.NEW_MESSAGE, handleNewMessage);
        return () => { cleanup(); };
    }, [targetUserId, markAsRead, user?.id]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const content = inputValue;
        setInputValue(''); // Optimistic clear

        try {
            const msg = await sendMessage(targetUserId, content);
            // Append locally
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send', error);
            setInputValue(content); // Revert
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!friend && !conversation) {
        return <div className="flex-1 flex items-center justify-center text-[#8c7b64]">{t('social:chat.userNotFound')}</div>;
    }

    const username = friend?.username || conversation?.username || 'User';
    const isOnline = friend?.online || conversation?.online || false;

    return (
        <div className="flex flex-col h-full bg-parchment-card-bg">
            {/* Header */}
            <div className="h-14 border-b border-parchment-card-border/30 flex items-center px-4 bg-parchment-base-bg shadow-sm z-10">
                <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-parchment-card-border flex items-center justify-center text-parchment-card-bg font-bold">
                        {username[0].toUpperCase()}
                    </div>
                    {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-parchment-base-bg" />}
                </div>
                <div className="ml-3 flex-1">
                    <div className="font-bold text-parchment-base-text text-sm">{username}</div>
                    <div className="text-[10px] text-parchment-light-text">
                        {isOnline ? t('social:status.online') : t('social:status.offline')}
                    </div>
                </div>
                {inviteData && isOnline && (
                    <button
                        onClick={async () => {
                            try {
                                const content = JSON.stringify({ matchId: inviteData.matchId, gameName: inviteData.gameName });
                                await sendMessage(targetUserId, content, 'invite');
                            } catch (e) {
                                console.error("Failed to invite", e);
                            }
                        }}
                        className="p-2 bg-parchment-base-text text-parchment-card-bg rounded-full hover:bg-parchment-brown transition-colors"
                        title={t('social:actions.invite')}
                    >
                        <Gamepad2 size={16} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {loading && <div className="text-center text-xs text-parchment-light-text">{t('common:loading')}...</div>}
                {messages.map((msg, index) => {
                    const isMe = msg.from !== targetUserId;
                    const showTime = index === 0 || (new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000);

                    return (
                        <div key={msg.id} className="flex flex-col">
                            {showTime && (
                                <div className="text-center text-[10px] text-parchment-light-text/60 mb-2 mt-2">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                            <div className={clsx("max-w-[80%] rounded-lg p-3 text-sm shadow-sm",
                                isMe ? "self-end bg-parchment-base-text text-parchment-card-bg rounded-br-none" : "self-start bg-white border border-parchment-card-border/30 text-parchment-base-text rounded-bl-none"
                            )}>
                                {msg.type === 'invite' ? (
                                    <div className="flex items-center gap-2">
                                        <Gamepad2 size={16} className="shrink-0" />
                                        <span>{t('social:chat.gameInvite')}</span>
                                        {/* TODO: Add join button if playable */}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-parchment-card-border/30">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('social:chat.placeholder')}
                        className="flex-1 bg-parchment-base-bg border border-parchment-card-border/40 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-parchment-base-text transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="absolute right-2 p-1.5 bg-parchment-base-text text-parchment-card-bg rounded-full hover:bg-parchment-brown disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};
