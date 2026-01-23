import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CategoryPills, type Category } from '../components/layout/CategoryPills';
import { GameDetailsModal } from '../components/lobby/GameDetailsModal';
import { GameList } from '../components/lobby/GameList';
import { getGamesByCategory, getGameById } from '../config/games.config';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { EmailBindModal } from '../components/auth/EmailBindModal';
import { useNavigate } from 'react-router-dom';
import { clearMatchCredentials, leaveMatch } from '../hooks/useMatchStatus';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { useModalStack } from '../contexts/ModalStackContext';
import clsx from 'clsx';
import { LobbyClient } from 'boardgame.io/client';
import { GAME_SERVER_URL } from '../config/server';

const lobbyClient = new LobbyClient({ server: GAME_SERVER_URL });

export const Home = () => {
    const [activeCategory, setActiveCategory] = useState<Category>('All');
    const [searchParams, setSearchParams] = useSearchParams();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();

    // 活跃对局状态
    const [activeMatch, setActiveMatch] = useState<{ matchID: string; gameName: string; players: Array<{ id: number; name?: string; isConnected?: boolean }> } | null>(null);
    const [myMatchRole, setMyMatchRole] = useState<{ playerID: string; credentials?: string; gameName?: string } | null>(null);
    const [localStorageTick, setLocalStorageTick] = useState(0);
    const [pendingAction, setPendingAction] = useState<{
        matchID: string;
        playerID: string;
        credentials: string;
        isHost: boolean;
    } | null>(null);

    const { user, logout } = useAuth();
    const { openModal, closeModal } = useModalStack();
    const { t } = useTranslation(['lobby', 'auth']);
    const selectedGameId = searchParams.get('game');
    const selectedGame = useMemo(() => selectedGameId ? getGameById(selectedGameId) : null, [selectedGameId]);
    const filteredGames = useMemo(() => getGamesByCategory(activeCategory), [activeCategory]);
    const activePlayerCount = activeMatch?.players.filter(player => player.name).length ?? 0;

    const confirmModalIdRef = useRef<string | null>(null);
    const gameDetailsModalIdRef = useRef<string | null>(null);
    const gameDetailsGameIdRef = useRef<string | null>(null);
    const authModalIdRef = useRef<string | null>(null);
    const emailBindModalIdRef = useRef<string | null>(null);

    const handleGameClick = (id: string) => {
        if (id === 'assetslicer') {
            navigate('/dev/slicer');
            return;
        }
        setSearchParams({ game: id });
    };

    const handleCloseModal = () => {
        setSearchParams({});
    };

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
    };

    const openAuth = (mode: 'login' | 'register') => {
        if (authModalIdRef.current) {
            closeModal(authModalIdRef.current);
            authModalIdRef.current = null;
        }
        authModalIdRef.current = openModal({
            closeOnBackdrop: true,
            closeOnEsc: true,
            lockScroll: true,
            onClose: () => {
                authModalIdRef.current = null;
            },
            render: ({ close, closeOnBackdrop }) => (
                <AuthModal
                    isOpen
                    onClose={() => {
                        close();
                    }}
                    initialMode={mode}
                    closeOnBackdrop={closeOnBackdrop}
                />
            ),
        });
    };

    const openEmailBind = () => {
        if (emailBindModalIdRef.current) {
            closeModal(emailBindModalIdRef.current);
            emailBindModalIdRef.current = null;
        }
        emailBindModalIdRef.current = openModal({
            closeOnBackdrop: true,
            closeOnEsc: true,
            lockScroll: true,
            onClose: () => {
                emailBindModalIdRef.current = null;
            },
            render: ({ close, closeOnBackdrop }) => (
                <EmailBindModal
                    isOpen
                    onClose={() => {
                        close();
                    }}
                    closeOnBackdrop={closeOnBackdrop}
                />
            ),
        });
    };

    // 检查是否有活跃对局（基于 localStorage，跨游戏）
    useEffect(() => {
        const handleStorage = () => setLocalStorageTick(t => t + 1);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const findLocalMatch = () => {
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith('match_creds_')) continue;
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                try {
                    const parsed = JSON.parse(raw);
                    const matchID = parsed.matchID || key.replace('match_creds_', '');
                    if (!matchID) continue;
                    const gameName = parsed.gameName || 'tictactoe';
                    return {
                        matchID,
                        playerID: parsed.playerID as string,
                        credentials: parsed.credentials as string | undefined,
                        gameName: gameName as string,
                    };
                } catch {
                    continue;
                }
            }
            return null;
        };

        const local = findLocalMatch();
        if (!local) {
            setActiveMatch(null);
            setMyMatchRole(null);
            return;
        }

        setMyMatchRole({
            playerID: local.playerID,
            credentials: local.credentials,
            gameName: local.gameName,
        });

        void lobbyClient.getMatch(local.gameName, local.matchID)
            .then(match => {
                if (cancelled) return;
                setActiveMatch({
                    matchID: local.matchID,
                    gameName: local.gameName,
                    players: match.players.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        isConnected: p.isConnected,
                    })),
                });
            })
            .catch((err) => {
                if (cancelled) return;
                const status = (err as { status?: number }).status;
                const message = (err as { message?: string }).message ?? '';
                if (status === 404 || message.includes('404')) {
                    // 房间已不存在，清理本地凭证避免重复请求
                    clearMatchCredentials(local.matchID);
                    setActiveMatch(null);
                    setMyMatchRole(null);
                    setLocalStorageTick((t) => t + 1);
                    return;
                }
                setActiveMatch({
                    matchID: local.matchID,
                    gameName: local.gameName,
                    players: [],
                });
            });

        return () => {
            cancelled = true;
        };
    }, [localStorageTick, user]);

    const handleReconnect = () => {
        if (!activeMatch || !myMatchRole) return;

        // 优先使用 myMatchRole 中保存的 gameName，否则回退到 activeMatch 中的 gameName，最后默认 tictactoe
        const gameId = myMatchRole.gameName || activeMatch.gameName || 'tictactoe';
        navigate(`/play/${gameId}/match/${activeMatch.matchID}?playerID=${myMatchRole.playerID}`);
    };

    const handleDestroyOrLeave = async () => {
        if (!activeMatch || !myMatchRole) return;

        const { playerID, credentials } = myMatchRole;
        let effectiveCredentials = credentials;

        if (!effectiveCredentials) {
            clearMatchCredentials(activeMatch.matchID);
            setActiveMatch(null);
            setMyMatchRole(null);
            setLocalStorageTick(t => t + 1);
            return;
        }

        const isHost = playerID === '0';
        setPendingAction({
            matchID: activeMatch.matchID,
            playerID,
            credentials: effectiveCredentials,
            isHost,
        });
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;

        let gameName = 'tictactoe';
        // 尝试获取正确的 gameName
        if (myMatchRole && myMatchRole.gameName) {
            gameName = myMatchRole.gameName;
        } else if (activeMatch && activeMatch.gameName) {
            gameName = activeMatch.gameName;
        }

        const success = await leaveMatch(gameName, pendingAction.matchID, pendingAction.playerID, pendingAction.credentials);
        if (!success) {
            // Keep state as-is so the user can retry or decide what to do next.
            return;
        }

        // On success, the backend has released the slot; update local state to match.
        clearMatchCredentials(pendingAction.matchID);
        setPendingAction(null);
        setLocalStorageTick(t => t + 1);
    };

    const handleCancelAction = () => {
        setPendingAction(null);
    };

    useEffect(() => {
        if (pendingAction && !confirmModalIdRef.current) {
            confirmModalIdRef.current = openModal({
                closeOnBackdrop: true,
                closeOnEsc: true,
                lockScroll: true,
                onClose: () => {
                    handleCancelAction();
                    confirmModalIdRef.current = null;
                },
                render: ({ close, closeOnBackdrop }) => (
                    <ConfirmModal
                        open
                        title={pendingAction.isHost ? t('lobby:confirm.destroy.title') : t('lobby:confirm.leave.title')}
                        description={pendingAction.isHost ? t('lobby:confirm.destroy.description') : t('lobby:confirm.leave.description')}
                        onConfirm={() => {
                            handleConfirmAction();
                        }}
                        onCancel={() => {
                            close();
                        }}
                        tone="warm"
                        closeOnBackdrop={closeOnBackdrop}
                    />
                ),
            });
        }

        if (!pendingAction && confirmModalIdRef.current) {
            closeModal(confirmModalIdRef.current);
            confirmModalIdRef.current = null;
        }
    }, [closeModal, handleCancelAction, handleConfirmAction, openModal, pendingAction]);

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.info('[Home] modal sync', {
                search: window.location.search,
                selectedGameId,
                selectedGame: selectedGame?.id,
                currentModalId: gameDetailsModalIdRef.current,
                currentGameId: gameDetailsGameIdRef.current,
            });
        }

        if (selectedGame && (gameDetailsGameIdRef.current !== selectedGame.id)) {
            if (gameDetailsModalIdRef.current) {
                closeModal(gameDetailsModalIdRef.current);
                gameDetailsModalIdRef.current = null;
            }
            gameDetailsGameIdRef.current = selectedGame.id;
            gameDetailsModalIdRef.current = openModal({
                closeOnBackdrop: true,
                closeOnEsc: true,
                lockScroll: true,
                onClose: () => {
                    gameDetailsModalIdRef.current = null;
                    gameDetailsGameIdRef.current = null;
                    handleCloseModal();
                },
                render: ({ close, closeOnBackdrop }) => (
                    <GameDetailsModal
                        isOpen
                        onClose={() => {
                            close();
                        }}
                        gameId={selectedGame.id}
                        titleKey={selectedGame.titleKey}
                        descriptionKey={selectedGame.descriptionKey}
                        thumbnail={selectedGame.thumbnail}
                        closeOnBackdrop={closeOnBackdrop}
                    />
                ),
            });
        }

        if (!selectedGame && gameDetailsModalIdRef.current) {
            closeModal(gameDetailsModalIdRef.current);
            gameDetailsModalIdRef.current = null;
            gameDetailsGameIdRef.current = null;
        }
    }, [closeModal, handleCloseModal, openModal, selectedGame, selectedGameId]);

    return (
        <div className="min-h-screen bg-[#f3f0e6] text-[#433422] font-serif overflow-y-scroll flex flex-col items-center">
            <header className="w-full relative px-6 md:px-12 pt-5 md:pt-8 pb-4">
                {/* 顶级操作区域 - 改为标准导航条逻辑，中大屏锁定右侧，小屏居中 */}
                <div className="md:absolute md:top-10 md:right-12 flex items-center justify-center md:justify-end gap-4 mb-8 md:mb-0">
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="group hover:text-[#2c2216] text-[#433422] flex items-center gap-2 cursor-pointer transition-colors px-4 py-2 rounded hover:bg-[#e8e4db]"
                            >
                                <span className="font-bold text-sm tracking-tight">{user.username}</span>
                            </button>
                            {showUserMenu && (
                                <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-[#fefcf7] shadow-[0_8px_32px_rgba(67,52,34,0.12)] border border-[#d3ccba] rounded-sm py-2 px-2 z-50 min-w-[160px] animate-in fade-in slide-in-from-top-1">
                                    <button
                                        onClick={() => { setShowUserMenu(false); openEmailBind(); }}
                                        className="relative w-full px-4 py-2 text-center cursor-pointer text-[#433422] font-bold text-xs hover:bg-[#f3f0e6] transition-colors"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {user?.emailVerified ? t('auth:menu.emailBound') : t('auth:menu.bindEmail')}
                                        </span>
                                    </button>
                                    <div className="h-px bg-[#e5e0d0] my-1 mx-2" />
                                    <button
                                        onClick={handleLogout}
                                        className="relative w-full px-4 py-2 text-center cursor-pointer text-[#433422] font-bold text-xs hover:bg-[#f3f0e6] transition-colors"
                                    >
                                        <span className="relative z-10">{t('auth:menu.logout')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <button onClick={() => openAuth('login')} className="hover:text-[#2c2216] cursor-pointer font-bold text-sm tracking-wider translate-y-[1px]">{t('auth:menu.login')}</button>
                            <button onClick={() => openAuth('register')} className="hover:text-[#2c2216] cursor-pointer font-bold text-sm tracking-wider translate-y-[1px]">{t('auth:menu.register')}</button>
                        </div>
                    )}
                    <LanguageSwitcher />
                </div>

                {/* 居中大标题 - 使用 clamp 保证响应式大小 */}
                <div className="flex flex-col items-center">
                    <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold tracking-[0.15em] text-[#433422] mb-1.5 text-center leading-tight">
                        {t('lobby:home.title')}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-px w-[115px] md:w-44 bg-[#433422] opacity-25" />
                        <img src="/logos/logo_1_grid.svg" alt="logo" className="w-5 md:w-6 opacity-60" />
                        <div className="h-px w-[115px] md:w-44 bg-[#433422] opacity-25" />
                    </div>
                </div>
            </header>

            {/* 主内容区域 - 商业级容器限制 */}
            <main className="w-full max-w-7xl flex flex-col items-center pt-0 px-6 md:px-8">
                {/* 分类筛选 */}
                <nav className="mb-6 w-full">
                    <CategoryPills activeCategory={activeCategory} onSelect={setActiveCategory} />
                </nav>

                {/* 游戏列表 */}
                <section className="w-full pb-20">
                    <GameList games={filteredGames} onGameClick={handleGameClick} />
                </section>
            </main>

            {/* 活跃对局指示器 */}
            {activeMatch && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-[#433422] text-[#fcfbf9] px-6 py-3 rounded shadow-xl border border-[#5c4a35] flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[#c0a080] uppercase tracking-wider font-bold">{t('lobby:home.activeMatch.status')}</span>
                            <span className="text-sm font-bold">
                                {t('lobby:home.activeMatch.room', { id: activeMatch.matchID.slice(0, 4) })}
                                <span className="mx-2 opacity-50">|</span>
                                <span className={activeMatch.players.some(p => p.name) ? 'opacity-100' : 'opacity-50 italic'}>
                                    {t('lobby:home.activeMatch.players', { count: activePlayerCount })}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {myMatchRole && (
                                <button
                                    onClick={handleDestroyOrLeave}
                                    className={clsx(
                                        "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border",
                                        myMatchRole.playerID === '0'
                                            ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                            : "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                                    )}
                                >
                                    {myMatchRole.playerID === '0' ? t('lobby:actions.destroy') : t('lobby:actions.leave')}
                                </button>
                            )}
                            <button
                                onClick={handleReconnect}
                                className="bg-[#c0a080] hover:bg-[#a08060] text-white px-6 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm border border-[#c0a080]"
                            >
                                {t('lobby:actions.reconnectEnter')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
