import { Component, type ErrorInfo, type ReactNode, lazy, Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import { CategoryPills, type Category } from '../components/layout/CategoryPills';
import { GameList } from '../components/lobby/GameList';
import { getGamesByCategory, getGameById, subscribeGameRegistry } from '../config/games.config';
import { resolveToolRoute } from '../config/toolRoutes';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import {
    claimSeat,
    clearMatchCredentials,
    exitMatch,
    getOwnerActiveMatch,
    clearOwnerActiveMatch,
    publishMatchCleanupNotice,
    readMatchCleanupNotice,
    hasSeenMatchCleanupNotice,
    markMatchCleanupNoticeSeen,
    isMatchNotFoundError,
    isOwnerActiveMatchSuppressed,
    rejoinMatch,
    getLatestStoredMatchCredentials,
    pruneStoredMatchCredentials,
    readStoredMatchCredentials,
    validateStoredMatchSeat,
} from '../hooks/match/useMatchStatus';
import type { MatchPlayer } from '../services/matchApi';
import { getOrCreateGuestId, getGuestName as resolveGuestName, getOwnerKey as resolveOwnerKey } from '../hooks/match/ownerIdentity';
import { ConfirmModal } from '../components/common/overlays/ConfirmModal';
import { LanguageSwitcher } from '../components/common/i18n/LanguageSwitcher';
import { UserMenu } from '../components/social/UserMenu';
import { useModalStack } from '../contexts/ModalStackContext';
import { useToast } from '../contexts/ToastContext';
import { useUrlModal } from '../hooks/routing/useUrlModal';
import clsx from 'clsx';
import * as matchApi from '../services/matchApi';
import { SEO } from '../components/common/SEO';
import { useLobbyStats } from '../hooks/useLobbyStats';
import { useLobbyMatchPresence } from '../hooks/useLobbyMatchPresence';
import { useGlobalCursor } from '../core/cursor/useGlobalCursor';
import { versionedPublicFileUrl } from '../lib/publicFileUrl';
import {
    readAndroidLiveUpdateSnapshot,
    type AndroidLiveUpdateSnapshot,
} from '../lib/mobile/androidLiveUpdates';
import { isNativeAndroidRuntime } from '../lib/mobile/androidRuntime';
import { AudioManager } from '../lib/audio/AudioManager';

const MISSING_MATCH_CONFIRM_RETRY_DELAY_MS = 1500;
const APP_VERSION_LABEL = `v${packageJson.version}`;
const LazyGameDetailsModal = lazy(() => import('../components/lobby/GameDetailsModal').then((m) => ({ default: m.GameDetailsModal })));
const toShortVersionLabel = (version: string) => version.replace(/^v/i, '').split('-')[0] || version.replace(/^v/i, '');

type HomeModalErrorBoundaryProps = {
    children: ReactNode;
    onError: () => void;
};

type HomeModalErrorBoundaryState = {
    hasError: boolean;
};

class HomeModalErrorBoundary extends Component<HomeModalErrorBoundaryProps, HomeModalErrorBoundaryState> {
    public state: HomeModalErrorBoundaryState = {
        hasError: false,
    };

    public static getDerivedStateFromError(): HomeModalErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[Home] 游戏详情弹窗渲染失败，已回退到首页', error, errorInfo);
        this.props.onError();
    }

    public componentDidUpdate(prevProps: HomeModalErrorBoundaryProps) {
        if (prevProps.children !== this.props.children && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    public render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}

export const Home = () => {
    useGlobalCursor();
    const isNativeAndroid = isNativeAndroidRuntime();
    const [activeCategory, setActiveCategory] = useState<Category>('All');
    const [, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [registryVersion, setRegistryVersion] = useState(0);
    const [gameModalReopenNonce, setGameModalReopenNonce] = useState(0);

    // 活跃对局状态
    const [activeMatch, setActiveMatch] = useState<{ matchID: string; gameName: string; players: Array<{ id: number; name?: string; isConnected?: boolean }> } | null>(null);
    const [myMatchRole, setMyMatchRole] = useState<{ playerID: string; credentials?: string; gameName?: string } | null>(null);
    const [localStorageTick, setLocalStorageTick] = useState(0);
    const [missingMatchConfirmRetryTick, setMissingMatchConfirmRetryTick] = useState(0);
    const [guestId, setGuestId] = useState<string | null>(null);
    const [otaSnapshot, setOtaSnapshot] = useState<AndroidLiveUpdateSnapshot | null>(null);
    const [isVersionExpanded, setIsVersionExpanded] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        matchID: string;
        playerID: string;
        credentials: string;
        isHost: boolean;
    } | null>(null);

    const refreshOtaSnapshot = useCallback(() => {
        if (!isNativeAndroid) {
            return;
        }

        let cancelled = false;
        void readAndroidLiveUpdateSnapshot()
            .then((snapshot) => {
                if (!cancelled) {
                    setOtaSnapshot(snapshot);
                }
            })
            .catch((error) => {
                console.warn('[Home] 读取 OTA 快照失败', error);
            });

        return () => {
            cancelled = true;
        };
    }, [isNativeAndroid]);

    // Monitoring & Stats
    const { mostPopularGameId } = useLobbyStats();

    const { user, token, logout } = useAuth();
    const { openModal, closeModal } = useModalStack();
    const { warning: toastWarning, error: toastError } = useToast();
    const { t, i18n } = useTranslation(['lobby', 'auth']);
    const getGuestId = () => getOrCreateGuestId();
    const getGuestName = () => resolveGuestName(t, guestId ?? undefined);
    const seoT = useMemo(() => {
        if (typeof i18n?.getFixedT === 'function') {
            return i18n.getFixedT('zh-CN', ['lobby', 'common']);
        }
        return t;
    }, [i18n, t]);
    const filteredGames = useMemo(() => {
        void registryVersion;
        return getGamesByCategory(activeCategory);
    }, [activeCategory, registryVersion]);
    useEffect(() => {
        if (user?.id) return;
        setGuestId((current) => current ?? getOrCreateGuestId());
    }, [user?.id]);

    const ownerActive = useMemo(() => {
        void localStorageTick;
        return getOwnerActiveMatch();
    }, [localStorageTick]);
    const ownerKey = useMemo(() => {
        if (user?.id) return resolveOwnerKey(user.id);
        if (!guestId) return null;
        return resolveOwnerKey(undefined, guestId);
    }, [guestId, user?.id]);
    const suppressedOwnerMatchId = useMemo(() => {
        if (!ownerActive?.matchID) return null;
        return isOwnerActiveMatchSuppressed(ownerActive.matchID) ? ownerActive.matchID : null;
    }, [ownerActive?.matchID]);

    useEffect(() => {
        if (!suppressedOwnerMatchId) return;
        clearOwnerActiveMatch(suppressedOwnerMatchId);
    }, [suppressedOwnerMatchId]);

    useEffect(() => {
        AudioManager.stopBgm();
    }, []);

    useEffect(() => {
        if (!isNativeAndroid) {
            return;
        }

        return refreshOtaSnapshot();
    }, [isNativeAndroid, refreshOtaSnapshot]);

    useEffect(() => {
        if (!isNativeAndroid) {
            return;
        }
    }, [isNativeAndroid]);

    const storedLocalMatchRole = useMemo(() => {
        void localStorageTick;
        const latestCreds = getLatestStoredMatchCredentials();
        if (latestCreds?.matchID) {
            const gameName = latestCreds.gameName || 'tictactoe';
            return {
                matchID: latestCreds.matchID,
                playerID: latestCreds.playerID as string,
                credentials: latestCreds.credentials as string | undefined,
                gameName: gameName as string,
            };
        }

        return null;
    }, [localStorageTick]);

    const ownerLocalMatchRole = useMemo(() => {
        if (storedLocalMatchRole) {
            return null;
        }

        if (suppressedOwnerMatchId) {
            return null;
        }

        if (ownerActive?.matchID && (!ownerActive.ownerKey || (ownerKey && ownerActive.ownerKey === ownerKey))) {
            return {
                matchID: ownerActive.matchID,
                playerID: '0',
                credentials: undefined,
                gameName: ownerActive.gameName,
            };
        }

        return null;
    }, [ownerActive, ownerKey, storedLocalMatchRole, suppressedOwnerMatchId]);
    const localMatchRole = storedLocalMatchRole ?? ownerLocalMatchRole;
    const activePlayerCount = activeMatch?.players.filter(player => player.name).length ?? 0;
    const activeBundleVersion = useMemo(() => {
        const bundleVersion = otaSnapshot?.currentBundleVersion?.trim();
        return bundleVersion || packageJson.version;
    }, [otaSnapshot?.currentBundleVersion]);
    const shouldShowNativeAppVersion = isNativeAndroid && otaSnapshot?.nativeAndroid === true;
    const homeVersionLabel = useMemo(
        () => isVersionExpanded ? activeBundleVersion.replace(/^v/i, '') : toShortVersionLabel(activeBundleVersion),
        [activeBundleVersion, isVersionExpanded],
    );
    const nativeAppVersion = otaSnapshot?.nativeVersion?.trim() || packageJson.version;
    const appVersionLabel = useMemo(
        () => isVersionExpanded ? nativeAppVersion.replace(/^v/i, '') : toShortVersionLabel(nativeAppVersion),
        [isVersionExpanded, nativeAppVersion],
    );
    const latestManifestVersion = otaSnapshot?.manifestVersion?.trim() || null;
    const latestManifestVersionLabel = useMemo(
        () => latestManifestVersion
            ? (isVersionExpanded ? latestManifestVersion.replace(/^v/i, '') : toShortVersionLabel(latestManifestVersion))
            : null,
        [isVersionExpanded, latestManifestVersion],
    );
    const otaVersionMismatch = shouldShowNativeAppVersion
        && Boolean(latestManifestVersion)
        && latestManifestVersion !== activeBundleVersion;
    const handleVersionFooterClick = () => {
        setIsVersionExpanded((expanded) => !expanded);
    };
    const nativeVersionTitle = useMemo(() => {
        if (!shouldShowNativeAppVersion) {
            return `当前版本 ${activeBundleVersion.replace(/^v/i, '')}\n点击${isVersionExpanded ? '收起' : '展开'}完整版本号`;
        }

        const lines = [
            `当前 Bundle ${activeBundleVersion.replace(/^v/i, '')}`,
            `App 壳版本 ${nativeAppVersion.replace(/^v/i, '')}`,
        ];
        if (latestManifestVersion) {
            lines.push(`最新 OTA ${latestManifestVersion.replace(/^v/i, '')}`);
        }
        if (otaVersionMismatch) {
            lines.push('状态：当前 Bundle 与最新 OTA 不一致');
        }
        lines.push(`点击${isVersionExpanded ? '收起' : '展开'}完整版本号`);
        return lines.join('\n');
    }, [
        activeBundleVersion,
        isVersionExpanded,
        latestManifestVersion,
        nativeAppVersion,
        otaVersionMismatch,
        shouldShowNativeAppVersion,
    ]);

    const confirmModalIdRef = useRef<string | null>(null);
    const authModalIdRef = useRef<string | null>(null);
    const missingMatchConfirmRef = useRef<string | null>(null);
    const missingMatchConfirmRetryTimerRef = useRef<number | null>(null);
    const initialUrlModalCheckDoneRef = useRef(false);
    const gameModalNavigateAwayBridgeRef = useRef<() => void>(() => {});

    const gameUrlModal = useUrlModal({
        paramKey: 'game',
        reopenNonce: gameModalReopenNonce,
        getModalConfig: useCallback((gameId: string) => {
            const game = getGameById(gameId);
            if (!game) return null;
            return {
                render: ({ close, closeOnBackdrop }: { close: () => void; closeOnBackdrop: boolean }) => (
                    <HomeModalErrorBoundary
                        onError={() => {
                            close();
                            gameModalNavigateAwayBridgeRef.current();
                        }}
                    >
                        <Suspense fallback={null}>
                            <LazyGameDetailsModal
                                isOpen
                                onClose={close}
                                gameId={game.id}
                                titleKey={game.titleKey}
                                descriptionKey={game.descriptionKey}
                                thumbnail={game.thumbnail}
                                closeOnBackdrop={closeOnBackdrop}
                                onNavigate={() => gameModalNavigateAwayBridgeRef.current()}
                            />
                        </Suspense>
                    </HomeModalErrorBoundary>
                ),
            };
        }, []),
    });
    const activeGameModalId = gameUrlModal.paramValue;
    gameModalNavigateAwayBridgeRef.current = () => {
        gameUrlModal.navigateAwayRef.current();
    };

    useEffect(() => {
        const unsubscribe = subscribeGameRegistry(() => {
            setRegistryVersion((version) => version + 1);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (initialUrlModalCheckDoneRef.current) {
            return;
        }
        initialUrlModalCheckDoneRef.current = true;
        if (activeGameModalId) {
            setGameModalReopenNonce((nonce) => nonce + 1);
        }
    }, [activeGameModalId]);

    useEffect(() => {
        if (!activeGameModalId) {
            return;
        }
        const game = getGameById(activeGameModalId);
        if (game?.type !== 'tool') {
            return;
        }
        const toolRoute = resolveToolRoute(activeGameModalId);
        if (!toolRoute) {
            return;
        }
        gameUrlModal.navigateAwayRef.current();
        navigate(toolRoute, { replace: true });
    }, [activeGameModalId, gameUrlModal.navigateAwayRef, navigate]);

    const handleGameClick = (id: string) => {
        const game = getGameById(id);
        if (game?.type === 'tool') {
            const toolRoute = resolveToolRoute(id);
            if (toolRoute) {
                gameUrlModal.navigateAwayRef.current();
                navigate(toolRoute);
            }
            return;
        }

        if (activeGameModalId === id) {
            setGameModalReopenNonce((nonce) => nonce + 1);
            return;
        }

        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('game', id);
            return next;
        });
    };

    const handleGameIntent = useCallback((id: string) => {
        const game = getGameById(id);
        if (game?.type === 'tool') {
            return;
        }
        void import('../components/lobby/GameDetailsModal').catch((error) => {
            console.warn('[Home] 预热 GameDetailsModal 失败，忽略并等待显式打开时重试', error);
        });
    }, []);

    const handleLogout = () => {
        logout();
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

    // 检查是否有活跃对局（基于本地存储，跨游戏）
    useEffect(() => {
        const handleStorage = () => setLocalStorageTick(t => t + 1);
        const handleCredentialsChange = () => setLocalStorageTick(t => t + 1);
        const handleOwnerActive = () => setLocalStorageTick(t => t + 1);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('match-credentials-changed', handleCredentialsChange);
        window.addEventListener('owner-active-match-changed', handleOwnerActive);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('match-credentials-changed', handleCredentialsChange);
            window.removeEventListener('owner-active-match-changed', handleOwnerActive);
        };
    }, []);

    const handleCleanupNotice = useCallback(() => {
        const notice = readMatchCleanupNotice();
        if (!notice) return;
        if (hasSeenMatchCleanupNotice(notice)) return;
        markMatchCleanupNoticeSeen(notice);
        toastWarning({ kind: 'i18n', key: 'error.roomDestroyed', ns: 'lobby' });
    }, [toastWarning]);

    useEffect(() => {
        const handleStorageNotice = (event: StorageEvent) => {
            if (event.key && event.key !== 'match_cleanup_notice') return;
            handleCleanupNotice();
        };
        window.addEventListener('match-cleanup-notice', handleCleanupNotice);
        window.addEventListener('storage', handleStorageNotice);
        return () => {
            window.removeEventListener('match-cleanup-notice', handleCleanupNotice);
            window.removeEventListener('storage', handleStorageNotice);
        };
    }, [handleCleanupNotice]);

    useEffect(() => {
        let cancelled = false;
        pruneStoredMatchCredentials();

        if (!localMatchRole) {
            setActiveMatch(null);
            setMyMatchRole(null);
            return;
        }

        const resolvedRole = {
            playerID: localMatchRole.playerID,
            credentials: localMatchRole.credentials,
            gameName: localMatchRole.gameName,
        };
        setMyMatchRole(resolvedRole);

        void matchApi.getMatch(localMatchRole.gameName, localMatchRole.matchID)
            .then(match => {
                if (cancelled) return;
                const stored = readStoredMatchCredentials(localMatchRole.matchID);
                const validation = validateStoredMatchSeat(stored, match.players, localMatchRole.playerID);
                if (validation.shouldClear) {
                    clearMatchCredentials(localMatchRole.matchID);
                    clearOwnerActiveMatch(localMatchRole.matchID);
                    setActiveMatch(null);
                    setMyMatchRole(null);
                    setLocalStorageTick((t) => t + 1);
                    return;
                }
                setMyMatchRole(resolvedRole);
                setActiveMatch({
                    matchID: localMatchRole.matchID,
                    gameName: localMatchRole.gameName,
                    players: match.players.map((p: MatchPlayer) => ({
                        id: p.id,
                        name: p.name,
                        isConnected: p.isConnected,
                    })),
                });
            })
            .catch(() => {
                if (cancelled) return;
                // 不在这里处理 404，交给 WebSocket 监听统一处理
                // 只设置一个临时状态，等待 WebSocket 确认
                setMyMatchRole(resolvedRole);
                setActiveMatch({
                    matchID: localMatchRole.matchID,
                    gameName: localMatchRole.gameName,
                    players: [],
                });
            });

        return () => {
            cancelled = true;
        };
    }, [localMatchRole]);

    const lobbyPresence = useLobbyMatchPresence({
        gameId: activeMatch?.gameName,
        matchId: activeMatch?.matchID,
        enabled: Boolean(activeMatch?.gameName && activeMatch?.matchID),
        requireSeen: false, // 允许立即判断房间是否存在，无需等待"先看到再消失"
    });
    const activeMatchGameName = activeMatch?.gameName ?? null;
    const activeMatchId = activeMatch?.matchID ?? null;

    useEffect(() => {
        return () => {
            if (missingMatchConfirmRetryTimerRef.current !== null) {
                window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
                missingMatchConfirmRetryTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!activeMatchGameName || !activeMatchId || !lobbyPresence.isMissing) {
            missingMatchConfirmRef.current = null;
            if (missingMatchConfirmRetryTimerRef.current !== null) {
                window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
                missingMatchConfirmRetryTimerRef.current = null;
            }
            return;
        }

        const gameName = activeMatchGameName;
        const matchID = activeMatchId;
        if (missingMatchConfirmRef.current === matchID) return;
        missingMatchConfirmRef.current = matchID;
        if (missingMatchConfirmRetryTimerRef.current !== null) {
            window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
            missingMatchConfirmRetryTimerRef.current = null;
        }

        let cancelled = false;

        void matchApi.getMatch(gameName, matchID)
            .then(() => {
                if (cancelled) return;
                if (missingMatchConfirmRetryTimerRef.current !== null) {
                    window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
                    missingMatchConfirmRetryTimerRef.current = null;
                }
                if (missingMatchConfirmRef.current === matchID) {
                    missingMatchConfirmRef.current = null;
                }
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                if (missingMatchConfirmRef.current === matchID) {
                    missingMatchConfirmRef.current = null;
                }
                if (!isMatchNotFoundError(error)) {
                    if (missingMatchConfirmRetryTimerRef.current === null) {
                        missingMatchConfirmRetryTimerRef.current = window.setTimeout(() => {
                            missingMatchConfirmRetryTimerRef.current = null;
                            setMissingMatchConfirmRetryTick((t) => t + 1);
                        }, MISSING_MATCH_CONFIRM_RETRY_DELAY_MS);
                    }
                    return;
                }

                if (missingMatchConfirmRetryTimerRef.current !== null) {
                    window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
                    missingMatchConfirmRetryTimerRef.current = null;
                }
                const notice = publishMatchCleanupNotice(matchID);
                if (notice && !hasSeenMatchCleanupNotice(notice)) {
                    markMatchCleanupNoticeSeen(notice);
                    toastWarning({ kind: 'i18n', key: 'error.roomDestroyed', ns: 'lobby' });
                }
                clearMatchCredentials(matchID);
                clearOwnerActiveMatch(matchID);
                setActiveMatch(null);
                setMyMatchRole(null);
                setLocalStorageTick((t) => t + 1);
            });

        return () => {
            cancelled = true;
            if (missingMatchConfirmRef.current === matchID) {
                missingMatchConfirmRef.current = null;
            }
            if (missingMatchConfirmRetryTimerRef.current !== null) {
                window.clearTimeout(missingMatchConfirmRetryTimerRef.current);
                missingMatchConfirmRetryTimerRef.current = null;
            }
        };
    }, [activeMatchGameName, activeMatchId, lobbyPresence.isMissing, missingMatchConfirmRetryTick, toastWarning]);

    const handleReconnect = () => {
        if (!activeMatch || !myMatchRole) return;

        // 优先使用 myMatchRole 中保存的游戏名，否则回退到 activeMatch 中的游戏名，最后默认 tictactoe
        const gameId = myMatchRole.gameName || activeMatch.gameName || 'tictactoe';

        console.log(
            `[Home] action=reconnect matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID} hasCred=${!!myMatchRole.credentials} gameName=${gameId} userId=${user?.id ?? ''}`
        );

        // 有凭证：直接进入
        if (myMatchRole.credentials) {
            navigate(`/play/${gameId}/match/${activeMatch.matchID}?playerID=${myMatchRole.playerID}`);
            return;
        }

        // 无凭证：登录用户优先走席位认领回归
        void (async () => {
            try {
                if (user?.id && token) {
                    console.log(
                        `[Home] action=claim-seat-start matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} userId=${user.id} gameName=${gameId}`
                    );
                    const claimResult = await claimSeat(
                        gameId,
                        activeMatch.matchID,
                        myMatchRole.playerID || '0',
                        { token, playerName: user.username }
                    );
                    if (claimResult.success) {
                        console.log(
                            `[Home] action=claim-seat-success matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} userId=${user.id}`
                        );
                        setMyMatchRole((prev) => (prev ? { ...prev, credentials: claimResult.credentials } : prev));
                        setLocalStorageTick((t) => t + 1);
                        navigate(`/play/${gameId}/match/${activeMatch.matchID}?playerID=${myMatchRole.playerID}`);
                        return;
                    }
                    console.warn(
                        `[Home] action=claim-seat-failed matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} userId=${user.id} error=${claimResult.error || ''} status=${claimResult.status || ''}`
                    );
                    if (claimResult.error === 'unauthorized' || claimResult.error === 'forbidden' || claimResult.error === 'not_found') {
                        clearMatchCredentials(activeMatch.matchID);
                        clearOwnerActiveMatch(activeMatch.matchID);
                        setActiveMatch(null);
                        setMyMatchRole(null);
                        setLocalStorageTick((t) => t + 1);
                        toastError({ kind: 'i18n', key: 'error.ownerClaimFailed', ns: 'lobby' });
                        return;
                    }
                } else {
                    const guestId = getGuestId();
                    const guestName = getGuestName();
                    console.log(
                        `[Home] action=claim-seat-guest-start matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} guestId=${guestId} gameName=${gameId}`
                    );
                    const claimResult = await claimSeat(
                        gameId,
                        activeMatch.matchID,
                        myMatchRole.playerID || '0',
                        { guestId, playerName: guestName }
                    );
                    if (claimResult.success) {
                        console.log(
                            `[Home] action=claim-seat-guest-success matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} guestId=${guestId}`
                        );
                        setMyMatchRole((prev) => (prev ? { ...prev, credentials: claimResult.credentials } : prev));
                        setLocalStorageTick((t) => t + 1);
                        navigate(`/play/${gameId}/match/${activeMatch.matchID}?playerID=${myMatchRole.playerID}`);
                        return;
                    }
                    console.warn(
                        `[Home] action=claim-seat-guest-failed matchID=${activeMatch.matchID} playerID=${myMatchRole.playerID || '0'} guestId=${guestId} error=${claimResult.error || ''} status=${claimResult.status || ''}`
                    );
                    if (claimResult.error === 'unauthorized' || claimResult.error === 'forbidden' || claimResult.error === 'not_found') {
                        clearMatchCredentials(activeMatch.matchID);
                        clearOwnerActiveMatch(activeMatch.matchID);
                        setActiveMatch(null);
                        setMyMatchRole(null);
                        setLocalStorageTick((t) => t + 1);
                        toastError({ kind: 'i18n', key: 'error.ownerClaimFailed', ns: 'lobby' });
                        return;
                    }
                }

                // 无凭证：让服务端直接分配可用席位
                const playerName = user?.username || getGuestName();
                const guestId = user?.id ? undefined : getGuestId();
                const { success, playerID: assignedPlayerID } = await rejoinMatch(
                    gameId,
                    activeMatch.matchID,
                    undefined,
                    playerName,
                    { guestId },
                );
                if (success && assignedPlayerID) {
                    navigate(`/play/${gameId}/match/${activeMatch.matchID}?playerID=${assignedPlayerID}`);
                }
            } catch {
                // 忽略错误
            }
        })();
    };

    const handleDestroyOrLeave = async () => {
        if (!activeMatch || !myMatchRole) return;

        const { playerID, credentials } = myMatchRole;
        const effectiveCredentials = credentials;

        if (!effectiveCredentials) {
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

    const handleConfirmAction = useCallback(async () => {
        if (!pendingAction) return;

        let gameName = 'tictactoe';
        // 尝试获取正确的游戏名
        if (myMatchRole && myMatchRole.gameName) {
            gameName = myMatchRole.gameName;
        } else if (activeMatch && activeMatch.gameName) {
            gameName = activeMatch.gameName;
        }

        const result = await exitMatch(
            gameName,
            pendingAction.matchID,
            pendingAction.playerID,
            pendingAction.credentials,
            pendingAction.isHost
        );
        if (!result.success) {
            const errorKey = result.error === 'forbidden'
                ? 'error.destroyForbidden'
                : result.error === 'network'
                    ? 'error.destroyNetwork'
                    : 'error.actionFailed';
            toastError({ kind: 'i18n', key: errorKey, ns: 'lobby' });
            return;
        }

        if (result.cleanedLocal) {
            toastWarning({ kind: 'i18n', key: 'error.destroyFailedLocalCleaned', ns: 'lobby' });
        }

        // 成功后后端释放座位，本地状态同步更新
        clearMatchCredentials(pendingAction.matchID);
        clearOwnerActiveMatch(pendingAction.matchID);
        setPendingAction(null);
        setLocalStorageTick(t => t + 1);
    }, [
        activeMatch,
        myMatchRole,
        pendingAction,
        toastError,
        toastWarning,
    ]);

    const handleCancelAction = useCallback(() => {
        setPendingAction(null);
    }, []);

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
    }, [closeModal, handleCancelAction, handleConfirmAction, openModal, pendingAction, t]);

    return (
        <div className="min-h-[100dvh] bg-parchment-base-bg text-parchment-base-text font-serif overflow-y-scroll flex flex-col items-center pb-[env(safe-area-inset-bottom)]">
            <SEO
                title={activeCategory === 'All' ? undefined : seoT(`common:category.${activeCategory}`)}
                description={seoT('lobby:home.subtitle')}
                canonical="https://easyboardgame.top/"
            />
            <header className="w-full relative px-6 md:px-12 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-8 pb-0">
                {/* 居中大标题 - 极简布局，Logo作为标题点缀 */}
                <div className="flex flex-col items-center justify-center mb-1 md:mb-4">
                    {/* 标题行：Logo + H1 */}
                    <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
                        <img
                            src={versionedPublicFileUrl('/logos/logo_1_grid.svg')}
                            alt="logo"
                            className="w-8 md:w-10 opacity-90"
                        />
                        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[0.1em] text-parchment-base-text leading-none pt-1">
                            {t('lobby:home.title')}
                        </h1>
                    </div>

                    {/* 副标题 */}
                    <p className="text-[10px] md:text-sm text-parchment-light-text tracking-[0.2em] font-bold uppercase opacity-80">
                        {t('lobby:home.subtitle')}
                    </p>
                </div>

                {/* 顶级操作区域 - 移动端放在标题下方，桌面端锁定右上角 */}
                <div className="flex items-center justify-center gap-4 mb-0 md:absolute md:top-8 md:right-12 md:mb-0 md:gap-4 md:justify-end">
                    {user ? (
                        <UserMenu onLogout={handleLogout} />
                    ) : (
                        <div className="flex items-center gap-6">
                            <button onClick={() => openAuth('login')} className="group relative inline-flex h-6 items-center hover:text-[#2c2216] cursor-pointer font-bold text-sm tracking-wider">
                                {t('auth:menu.login')}
                                <span className="underline-center" />
                            </button>
                            <div className="w-[1px] h-3 bg-parchment-light-text/30" />
                            <button onClick={() => openAuth('register')} className="group relative inline-flex h-6 items-center hover:text-[#2c2216] cursor-pointer font-bold text-sm tracking-wider">
                                {t('auth:menu.register')}
                                <span className="underline-center" />
                            </button>
                        </div>
                    )}
                    <LanguageSwitcher />
                </div>
            </header>

            {/* 主内容区域 - 商业级容器限制 */}
            <main className="w-full max-w-7xl flex flex-col items-center pt-0 px-4 sm:px-6 md:px-8">
                {/* 分类筛选 */}
                <nav className="mb-4 md:mb-6 w-full">
                    <CategoryPills activeCategory={activeCategory} onSelect={setActiveCategory} />
                </nav>

                {/* 游戏列表 */}
                <section className="w-full pb-20">
                    <GameList
                        games={filteredGames}
                        onGameClick={handleGameClick}
                        onGameIntent={handleGameIntent}
                        mostPopularGameId={mostPopularGameId}
                    />
                </section>
            </main>

            {/* 活跃对局指示器 */}
            <button
                type="button"
                onClick={handleVersionFooterClick}
                className="fixed right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 max-w-[min(72vw,20rem)] select-none text-right text-[0.7rem] md:text-[0.78rem] leading-none tracking-[0.08em] text-parchment-light-text/80 cursor-pointer"
                aria-label={shouldShowNativeAppVersion
                    ? otaVersionMismatch
                        ? `Current bundle version ${homeVersionLabel}, app version ${appVersionLabel}, latest ota version ${latestManifestVersionLabel ?? 'unknown'}, versions are not aligned`
                        : `Current bundle version ${homeVersionLabel}, app version ${appVersionLabel}`
                    : `Current version ${homeVersionLabel}`}
                title={nativeVersionTitle}
            >
                <span className="block break-all">
                    {shouldShowNativeAppVersion ? `Bundle ${homeVersionLabel}` : homeVersionLabel}
                </span>
                {shouldShowNativeAppVersion && (
                    <span className="mt-1 block text-[0.58rem] tracking-[0.04em] text-parchment-light-text/60 md:text-[0.64rem]">
                        App {appVersionLabel}
                    </span>
                )}
                {shouldShowNativeAppVersion && latestManifestVersionLabel && (
                    <span className={`mt-1 block text-[0.58rem] tracking-[0.04em] md:text-[0.64rem] ${otaVersionMismatch ? 'text-red-700/90' : 'text-parchment-light-text/55'}`}>
                        Latest {latestManifestVersionLabel}
                    </span>
                )}
                {otaVersionMismatch && (
                    <span className="mt-1 block text-[0.58rem] font-bold tracking-[0.04em] text-red-800 md:text-[0.64rem]">
                        OTA 未对齐
                    </span>
                )}
            </button>

            {activeMatch && (
                <div
                    data-testid="home-active-match-banner"
                    className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center px-3 sm:px-4 md:px-6 animate-in slide-in-from-bottom-4 fade-in duration-300"
                >
                    <div
                        data-testid="home-active-match-card"
                        className="pointer-events-auto flex w-fit max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-[10px] border border-parchment-brown bg-parchment-base-text/98 px-3 py-2.5 text-parchment-card-bg shadow-xl backdrop-blur-sm sm:max-w-[min(46rem,calc(100vw-2rem))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3"
                    >
                        <div className="min-w-0 text-center sm:flex-1 sm:text-left">
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-parchment-light-text sm:text-[10px] sm:tracking-wider">
                                {t('lobby:home.activeMatch.status')}
                            </span>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[13px] font-bold leading-tight sm:justify-start sm:gap-x-2 sm:gap-y-1 sm:text-sm">
                                <span className="max-w-full truncate">
                                    {t('lobby:home.activeMatch.room', { id: activeMatch.matchID.slice(0, 4) })}
                                </span>
                                <span className="hidden opacity-50 sm:inline">|</span>
                                <span
                                    className={clsx(
                                        'max-w-full truncate',
                                        activeMatch.players.some(p => p.name) ? 'opacity-100' : 'opacity-50 italic'
                                    )}
                                >
                                    {t('lobby:home.activeMatch.players', { count: activePlayerCount })}
                                </span>
                            </div>
                        </div>
                        <div
                            data-testid="home-active-match-actions"
                            className="flex w-fit max-w-full flex-row flex-wrap items-center justify-center gap-1.5 self-center sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-end sm:self-auto sm:gap-2"
                        >
                            {myMatchRole?.credentials && (
                                <button
                                    onClick={handleDestroyOrLeave}
                                    className={clsx(
                                        "min-w-[4.5rem] rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] transition-all cursor-pointer border sm:min-w-0 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-wider",
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
                                className="min-w-[5.75rem] rounded border border-parchment-light-text bg-parchment-light-text px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm transition-colors cursor-pointer hover:bg-[#a08060] sm:min-w-0 sm:px-6 sm:py-1.5 sm:text-xs sm:tracking-wider"
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
