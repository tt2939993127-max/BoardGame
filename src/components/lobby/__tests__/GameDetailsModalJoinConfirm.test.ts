/* @vitest-environment happy-dom */
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildLocalMatchSearchParams,
    normalizeSeatController,
    resolveAiMinimumActionDelayMs,
    resolveSeatControllersFromSearchParams,
} from '../../../engine/ai';
import { GameDetailsModal } from '../GameDetailsModal';
import { AiSupportPills } from '../AiSupportPills';
import { GameDetailsMobilePackageCard } from '../GameDetailsMobilePackageCard';
import {
    clearLocalMatchSnapshot,
    ensureLocalMatchSeedSearchParams,
    persistLocalMatchSnapshot,
    readLocalMatchSnapshot,
} from '../../../engine/transport/localSession';
import { resolveActiveMatchExitPayload, shouldPromptExitActiveMatch } from '../roomActions';
import { RoomList } from '../RoomList';
import * as matchApi from '../../../services/matchApi';
import * as matchStatus from '../../../hooks/match/useMatchStatus';
import { lobbySocket } from '../../../services/lobbySocket';
import { resetGamePackageManagerForTests } from '../../../features/mobile-packages/packageManagerService';

const navigateMock = vi.fn();
const openModalMock = vi.fn();
const closeModalMock = vi.fn();
const { getGameByIdMock, latestCreateRoomModalProps, latestPackageInstallModalProps } = vi.hoisted(() => ({
    getGameByIdMock: vi.fn((gameId: string) => {
        if (gameId !== 'dicethrone') return null;
        return {
            id: 'dicethrone',
            type: 'game',
            enabled: true,
            titleKey: 'games.dicethrone.title',
            descriptionKey: 'games.dicethrone.description',
            category: 'dice',
            playersKey: 'games.dicethrone.players',
            icon: '🎲',
            allowLocalMode: true,
            playerOptions: [2],
            mobileDelivery: {
                mode: 'package-managed',
                runtimeChannel: 'stable',
                modulePackId: 'dicethrone',
                assetPackId: 'dicethrone',
            },
            ai: {
                capture: true,
                localAi: true,
                remoteAi: true,
            },
        };
    }),
    latestCreateRoomModalProps: { current: null as null | Record<string, unknown> },
    latestPackageInstallModalProps: { current: null as null | Record<string, unknown> },
}));

const buildMockGameManifest = (override: Record<string, unknown> = {}) => ({
    id: 'dicethrone',
    type: 'game',
    enabled: true,
    titleKey: 'games.dicethrone.title',
    descriptionKey: 'games.dicethrone.description',
    category: 'dice',
    playersKey: 'games.dicethrone.players',
    icon: '🎲',
    allowLocalMode: true,
    playerOptions: [2],
    mobileDelivery: {
        mode: 'package-managed',
        runtimeChannel: 'stable',
        modulePackId: 'dicethrone',
        assetPackId: 'dicethrone',
    },
    ai: {
        capture: true,
        localAi: true,
        remoteAi: true,
    },
    ...override,
});
const toastMock = {
    warning: vi.fn(),
    error: vi.fn(),
};

const markGamePackageInstalled = (gameId = 'dicethrone') => {
    window.localStorage.setItem(`mobile-package-state:${gameId}`, JSON.stringify({
        gameId,
        runtimeChannel: 'stable',
        status: 'installed',
        modulePackId: gameId,
        assetPackId: gameId,
        updatedAt: Date.now(),
    }));
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            language: 'zh-CN',
            hasLoadedNamespace: () => true,
            loadNamespaces: vi.fn().mockResolvedValue(undefined),
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => undefined,
    },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        token: null,
    }),
}));

vi.mock('../../../contexts/ModalStackContext', () => ({
    useModalStack: () => ({
        openModal: openModalMock,
        closeModal: closeModalMock,
    }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
    useToast: () => toastMock,
}));

vi.mock('../../../config/server', () => ({
    GAME_SERVER_URL: 'http://test.example',
}));

vi.mock('../../../api/user-settings', () => ({
    getLocalMatchPreferences: vi.fn(),
    updateLocalMatchPreferences: vi.fn(),
}));

vi.mock('../../../config/games.config', () => ({
    getGameById: getGameByIdMock,
}));

vi.mock('../../../services/lobbySocket', () => ({
    lobbySocket: {
        subscribe: vi.fn((_gameId: string, callback: (matches: unknown[]) => void) => {
            callback([]);
            return () => {};
        }),
        subscribeStatus: vi.fn(() => () => {}),
        requestRefresh: vi.fn(),
    },
}));

vi.mock('../../../hooks/match/useMatchStatus', () => ({
    claimSeat: vi.fn(),
    exitMatch: vi.fn(),
    getOwnerActiveMatch: vi.fn(() => null),
    setOwnerActiveMatch: vi.fn(),
    clearOwnerActiveMatch: vi.fn(),
    isOwnerActiveMatchSuppressed: vi.fn(() => false),
    suppressOwnerActiveMatch: vi.fn(),
    clearMatchCredentials: vi.fn(),
    readStoredMatchCredentials: vi.fn(() => null),
    listStoredMatchCredentials: vi.fn(() => []),
    getLatestStoredMatchCredentials: vi.fn(() => null),
    pruneStoredMatchCredentials: vi.fn(),
    persistAiSeatCredentials: vi.fn(),
    persistMatchCredentials: vi.fn(),
    isMatchNotFoundError: (err: unknown) => String(err).includes('404'),
}));

vi.mock('../../../hooks/match/ownerIdentity', () => ({
    getOrCreateGuestId: () => 'guest-1',
    getGuestName: () => 'Guest',
    getOwnerKey: () => 'owner-1',
    getOwnerType: () => 'guest',
}));

vi.mock('../../common/overlays/ConfirmModal', () => ({
    ConfirmModal: () => null,
}));

vi.mock('../../common/overlays/ModalBase', () => ({
    ModalBase: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

vi.mock('../CreateRoomModal', () => ({
    CreateRoomModal: ({
        isOpen,
        isLoading,
        onConfirm,
        initialPreferences,
    }: {
        isOpen: boolean;
        isLoading?: boolean;
        onConfirm: (config: unknown) => void;
        initialPreferences?: unknown;
    }) => {
        latestCreateRoomModalProps.current = { isOpen, isLoading, initialPreferences };
        return isOpen
            ? createElement('div', null,
                createElement('button', {
                    type: 'button',
                    onClick: () => onConfirm({
                        roomName: 'AI 房间',
                        numPlayers: 2,
                        ttlSeconds: 0,
                        password: '',
                        enableAi: true,
                        seatControllers: {
                            '0': { type: 'human' },
                            '1': { type: 'local-ai' },
                        },
                        setupSelections: {},
                    }),
                }, 'mock-create-room-confirm'),
                isLoading ? createElement('span', null, 'mock-create-room-loading') : null,
            )
            : null;
    },
}));

vi.mock('../../common/overlays/PasswordEntryModal', () => ({
    PasswordEntryModal: () => null,
}));

vi.mock('../LeaderboardTab', () => ({
    LeaderboardTab: () => createElement('div', null, 'leaderboard'),
}));

vi.mock('../GameDetailsChangelogSection', () => ({
    GameDetailsChangelogSection: () => createElement('div', null, 'changelog'),
}));

vi.mock('../GamePackageInstallConfirmModal', () => ({
    GamePackageInstallConfirmModal: (props: Record<string, unknown>) => {
        latestPackageInstallModalProps.current = props;
        return createElement('div', null, 'package-install-confirm');
    },
}));

vi.mock('../../review/GameReviewSection', () => ({
    GameReviews: () => createElement('div', null, 'reviews'),
}));

const buildStored = (override: Partial<{ matchID: string; playerID: string; credentials: string; gameName: string }> = {}) => ({
    matchID: 'match-1',
    playerID: '1',
    credentials: 'creds',
    gameName: 'tictactoe',
    ...override,
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

beforeEach(() => {
    window.localStorage.clear();
    resetGamePackageManagerForTests();
    navigateMock.mockReset();
    openModalMock.mockReset();
    openModalMock.mockReturnValue('modal-1');
    closeModalMock.mockReset();
    getGameByIdMock.mockReset();
    getGameByIdMock.mockImplementation((gameId: string) => {
        if (gameId !== 'dicethrone') return null;
        return buildMockGameManifest();
    });
    toastMock.warning.mockReset();
    toastMock.error.mockReset();
    latestCreateRoomModalProps.current = null;
    latestPackageInstallModalProps.current = null;
});

describe('GameDetailsModal join confirm helpers', () => {
    it('有活跃对局且目标不同则提示退出当前对局', () => {
        expect(shouldPromptExitActiveMatch('match-1', 'match-2')).toBe(true);
    });

    it('相同房间不提示退出当前对局', () => {
        expect(shouldPromptExitActiveMatch('match-1', 'match-1')).toBe(false);
    });

    it('缺少凭证时不返回退出参数', () => {
        const stored = buildStored({ credentials: '' });
        const result = resolveActiveMatchExitPayload('match-1', stored, null, 'dicethrone');
        expect(result).toBeNull();
    });

    it('有完整凭证时返回标准退出参数', () => {
        const stored = buildStored({ gameName: 'SmashUp', playerID: '0' });
        const result = resolveActiveMatchExitPayload('match-1', stored, null, 'dicethrone');
        expect(result).toEqual({
            gameName: 'smashup',
            playerID: '0',
            credentials: 'creds',
        });
    });

    it('缺少游戏名时回退到 ownerActive 或 fallbackGameName', () => {
        const stored = buildStored({ gameName: '' });
        const result = resolveActiveMatchExitPayload(
            'match-1',
            stored,
            { matchID: 'match-1', gameName: 'SummonerWars' },
            'dicethrone',
        );
        expect(result?.gameName).toBe('summonerwars');
    });
});

describe('AI seat controller helpers', () => {
    const aiSupport = {
        capture: true,
        localAi: true,
        remoteAi: true,
    };

    it('双人本地 AI 游戏默认让 seat1 使用 local-ai', () => {
        const searchParams = new URLSearchParams();
        const controllers = resolveSeatControllersFromSearchParams({
            numPlayers: 2,
            searchParams,
            aiSupport,
        });

        expect(controllers['0']).toEqual({ type: 'human' });
        expect(controllers['1']).toEqual({ type: 'local-ai', difficulty: 'normal' });
    });

    it('显式 seat 参数可以覆盖默认 controller', () => {
        const searchParams = new URLSearchParams('seat1=human');
        const controllers = resolveSeatControllersFromSearchParams({
            numPlayers: 2,
            searchParams,
            aiSupport,
        });

        expect(controllers['1']).toEqual({ type: 'human' });
    });

    it('buildLocalMatchSearchParams 会输出玩家数和 controller 参数', () => {
        const search = buildLocalMatchSearchParams({
            numPlayers: 3,
            playerOptions: [2, 3, 4],
            aiSupport,
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai', policyId: 'opening-v1', difficulty: 'hard' },
                '2': { type: 'remote-ai', providerId: 'astrbot' },
            },
        });

        expect(search.get('players')).toBe('3');
        expect(search.get('seat1')).toBe('local-ai:opening-v1');
        expect(search.get('seat1Difficulty')).toBe('hard');
        expect(search.get('seat2')).toBe('remote-ai:astrbot');
    });

    it('显式 difficulty 参数会恢复到 local-ai controller', () => {
        const searchParams = new URLSearchParams('seat1=local-ai:opening-v1&seat1Difficulty=expert');
        const controllers = resolveSeatControllersFromSearchParams({
            numPlayers: 2,
            searchParams,
            aiSupport,
        });

        expect(controllers['1']).toEqual({
            type: 'local-ai',
            policyId: 'opening-v1',
            difficulty: 'expert',
        });
    });

    it('AI controller 默认使用统一最小时长，并支持自定义覆盖', () => {
        expect(resolveAiMinimumActionDelayMs({ type: 'human' })).toBe(0);
        expect(resolveAiMinimumActionDelayMs({ type: 'local-ai' })).toBe(600);
        expect(resolveAiMinimumActionDelayMs({ type: 'remote-ai', providerId: 'astrbot' })).toBe(600);
        expect(resolveAiMinimumActionDelayMs({ type: 'local-ai', minimumActionDelayMs: 950 })).toBe(950);
    });

    it('normalizeSeatController 会保留并清洗 AI 最小时长', () => {
        expect(normalizeSeatController({
            type: 'local-ai',
            minimumActionDelayMs: 321.4,
        }, aiSupport)).toEqual({
            type: 'local-ai',
            minimumActionDelayMs: 321,
        });

        expect(normalizeSeatController({
            type: 'remote-ai',
            providerId: 'astrbot',
            minimumActionDelayMs: -50,
        }, aiSupport)).toEqual({
            type: 'remote-ai',
            providerId: 'astrbot',
            minimumActionDelayMs: 0,
        });
    });
});

describe('AiSupportPills', () => {
    it('只渲染已启用的 AI 能力标签', () => {
        render(createElement(AiSupportPills, {
            ai: {
                capture: true,
                localAi: true,
                remoteAi: false,
            },
        }));

        expect(screen.getByText('ai.capture')).toBeInTheDocument();
        expect(screen.getByText('ai.local')).toBeInTheDocument();
        expect(screen.queryByText('ai.remote')).toBeNull();
    });
});

describe('GameDetailsMobilePackageCard', () => {
    it('进行中状态显示进度条和阶段文案', () => {
        render(createElement(GameDetailsMobilePackageCard, {
            gameName: 'Tic-Tac-Toe',
            state: {
                status: 'manifest',
                progressMode: 'indeterminate',
            },
            onInstall: vi.fn(),
        }));

        expect(screen.getByTestId('game-details-mobile-package-progress-track')).toBeInTheDocument();
        expect(screen.getByText('packageManager.progress.manifestTitle')).toBeInTheDocument();
        expect(screen.getByText('packageManager.progress.pendingPercent')).toBeInTheDocument();
    });

    it('失败状态显示重试按钮和错误文案', () => {
        const retryMock = vi.fn();

        render(createElement(GameDetailsMobilePackageCard, {
            gameName: 'Tic-Tac-Toe',
            state: {
                status: 'failed',
                errorMessage: '下载器待接入',
            },
            onInstall: vi.fn(),
            onRetry: retryMock,
        }));

        expect(screen.getByText('下载器待接入')).toBeInTheDocument();

        fireEvent.click(screen.getByText('packageManager.retryAction'));

        expect(retryMock).toHaveBeenCalledTimes(1);
    });

    it('更新模式显示更新提示而不是安装按钮', () => {
        render(createElement(GameDetailsMobilePackageCard, {
            gameName: 'Tic-Tac-Toe',
            state: {
                status: 'not-installed',
            },
            onInstall: vi.fn(),
            presentation: 'update-required',
            requiredAppVersion: '0.6.0',
        }));

        expect(screen.getByText('packageManager.updateRequiredTitle')).toBeInTheDocument();
        expect(screen.getByText('packageManager.updateRequiredHintWithVersion')).toBeInTheDocument();
        expect(screen.queryByText('packageManager.installAction')).toBeNull();
    });

    it('未安装状态只保留安装按钮，不再显示下载圆球', () => {
        render(createElement(GameDetailsMobilePackageCard, {
            gameName: 'Tic-Tac-Toe',
            state: {
                status: 'not-installed',
            },
            onInstall: vi.fn(),
        }));

        const card = screen.getByTestId('game-details-mobile-package-card');
        expect(screen.getByText('packageManager.installAction')).toBeInTheDocument();
        expect(card.querySelector('.h-10.w-10.rounded-full')).toBeNull();
    });

    it('已安装状态显示可直接进入文案', () => {
        render(createElement(GameDetailsMobilePackageCard, {
            gameName: 'Tic-Tac-Toe',
            state: {
                status: 'installed',
            },
            onInstall: vi.fn(),
        }));

        expect(screen.getByText('packageManager.installedTitle')).toBeInTheDocument();
        expect(screen.queryByText('packageManager.installAction')).toBeNull();
    });
});

describe('GameDetailsModal create room ai entry', () => {
    const baseProps = {
        isOpen: true,
        onClose: vi.fn(),
        gameId: 'dicethrone',
        titleKey: 'games.dicethrone.title',
        descriptionKey: 'games.dicethrone.description',
        thumbnail: createElement('div'),
    };

    it('创建房间弹窗内直接配置 AI，不再显示独立对战 AI 入口', async () => {
        markGamePackageInstalled();
        vi.spyOn(matchApi, 'createMatch').mockResolvedValueOnce({ matchID: 'match-ai-1' });
        vi.spyOn(matchApi, 'claimSeat').mockResolvedValueOnce({ playerCredentials: 'ai-seat-1' });
        vi.mocked(matchStatus.claimSeat).mockResolvedValueOnce({
            success: true,
            credentials: 'host-cred',
        });

        render(createElement(GameDetailsModal, baseProps));

        expect(screen.queryByText('actions.playAi')).toBeNull();
        expect(screen.queryByText('ai.configureTitle')).toBeNull();

        fireEvent.click(screen.getByText('actions.createRoom'));
        await waitFor(() => {
            expect(screen.getByText('mock-create-room-confirm')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('mock-create-room-confirm'));

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/play/dicethrone/match/match-ai-1?playerID=0');
        });

        expect(matchApi.createMatch).toHaveBeenCalledWith(
            'dicethrone',
            expect.objectContaining({
                numPlayers: 2,
                setupData: expect.objectContaining({
                    enableAi: true,
                    seatControllers: expect.objectContaining({
                        '0': { type: 'human' },
                        '1': { type: 'local-ai' },
                    }),
                }),
            }),
            undefined,
        );
        expect(matchApi.claimSeat).toHaveBeenCalledWith(
            'dicethrone',
            'match-ai-1',
            '1',
            expect.objectContaining({
                guestId: 'guest-1',
            }),
        );
    });

    it('未保存过 AI 偏好时，创建房间弹窗默认传入空偏好', async () => {
        markGamePackageInstalled();
        render(createElement(GameDetailsModal, baseProps));

        fireEvent.click(screen.getByText('actions.createRoom'));

        await waitFor(() => {
            expect(screen.getByText('mock-create-room-confirm')).toBeInTheDocument();
        });

        expect(latestCreateRoomModalProps.current).toEqual(
            expect.objectContaining({
                initialPreferences: null,
            }),
        );
    });

    it('package-managed 游戏默认渲染单一下载入口', () => {
        render(createElement(GameDetailsModal, baseProps));

        const packageCard = screen.getByTestId('game-details-mobile-package-card');
        expect(packageCard).toBeInTheDocument();
        expect(packageCard.className).toContain('md:hidden');
        expect(screen.getByText('packageManager.installAction')).toBeInTheDocument();
    });

    it('未下载 package-managed 游戏时，创建房间会先拉起下载确认', async () => {
        render(createElement(GameDetailsModal, baseProps));

        fireEvent.click(screen.getByText('actions.createRoom'));

        await waitFor(() => {
            expect(screen.getByText('package-install-confirm')).toBeInTheDocument();
        });
        expect(screen.queryByText('mock-create-room-confirm')).toBeNull();
        expect(latestPackageInstallModalProps.current).toEqual(
            expect.objectContaining({
                gameName: 'games.dicethrone.title',
                state: expect.objectContaining({
                    status: 'not-installed',
                }),
            }),
        );
    });

    it('下载完成后，package-managed 游戏允许创建房间', async () => {
        markGamePackageInstalled();
        render(createElement(GameDetailsModal, baseProps));

        fireEvent.click(screen.getByText('actions.createRoom'));
        await waitFor(() => {
            expect(screen.getByText('mock-create-room-confirm')).toBeInTheDocument();
        });
    });

    it('标记必须更新时，渲染移动端更新提示入口', () => {
        getGameByIdMock.mockImplementation((gameId: string) => {
            if (gameId !== 'dicethrone') return null;
            return buildMockGameManifest({
                mobileDelivery: {
                    mode: 'package-managed',
                    runtimeChannel: 'stable',
                    modulePackId: 'dicethrone',
                    assetPackId: 'dicethrone',
                    requiresAppUpdate: true,
                    requiredAppVersion: '0.6.0',
                },
            });
        });

        render(createElement(GameDetailsModal, baseProps));

        const packageCard = screen.getByTestId('game-details-mobile-package-card');
        expect(packageCard).toBeInTheDocument();
        expect(packageCard.className).toContain('md:hidden');
        expect(screen.getByText('packageManager.updateRequiredTitle')).toBeInTheDocument();
        expect(screen.queryByText('packageManager.installAction')).toBeNull();
    });

    it('观战前发现房间 404 时不再跳进对局页，并提示房间已销毁', async () => {
        markGamePackageInstalled();
        vi.mocked(lobbySocket.subscribe).mockImplementationOnce((_gameId, callback) => {
            callback([{
                matchID: 'match-spectate',
                players: [
                    { id: 0, name: 'A' },
                    { id: 1, name: 'B' },
                ],
                totalSeats: 2,
                gameName: 'dicethrone',
                roomName: '测试房间',
                ownerKey: 'owner-2',
                ownerType: 'guest',
                isLocked: false,
            }]);
            return () => {};
        });
        vi.spyOn(matchApi, 'getMatch').mockRejectedValueOnce(new Error('404: Match not found'));

        render(createElement(GameDetailsModal, baseProps));

        fireEvent.click(screen.getByTitle('actions.spectate'));

        await waitFor(() => {
            expect(navigateMock).not.toHaveBeenCalledWith('/play/dicethrone/match/match-spectate?spectate=1');
        });
        expect(vi.mocked(lobbySocket.requestRefresh)).toHaveBeenCalledWith('dicethrone');
        expect(toastMock.warning).toHaveBeenCalledWith({ kind: 'i18n', key: 'error.roomDestroyed', ns: 'lobby' });
    });

    it('builtin 游戏不渲染移动端包管理入口', () => {
        getGameByIdMock.mockImplementation((gameId: string) => {
            if (gameId !== 'dicethrone') return null;
            return buildMockGameManifest({
                mobileDelivery: {
                    mode: 'builtin',
                },
            });
        });

        render(createElement(GameDetailsModal, baseProps));

        expect(screen.queryByTestId('game-details-mobile-package-card')).toBeNull();
    });

    it('创建房间时显示进入对局 loading', async () => {
        markGamePackageInstalled();
        let resolveCreateMatch: ((value: { matchID: string }) => void) | null = null;
        vi.spyOn(matchApi, 'createMatch').mockImplementationOnce(() => new Promise((resolve) => {
            resolveCreateMatch = resolve as (value: { matchID: string }) => void;
        }));
        vi.mocked(matchStatus.claimSeat).mockResolvedValueOnce({ success: true, credentials: 'seat-creds' } as never);
        vi.spyOn(matchApi, 'claimSeat').mockResolvedValueOnce({ playerCredentials: 'ai-seat-creds' });

        render(createElement(GameDetailsModal, baseProps));

        fireEvent.click(screen.getByText('actions.createRoom'));
        await waitFor(() => {
            expect(screen.getByText('mock-create-room-confirm')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('mock-create-room-confirm'));

        await waitFor(() => {
            expect(screen.getByText('matchRoom.title.creating')).toBeInTheDocument();
            expect(screen.getByText('matchRoom.creatingRoom')).toBeInTheDocument();
        });

        resolveCreateMatch?.({ matchID: 'match-created' });

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/play/dicethrone/match/match-created?playerID=0');
        });
    });

    it('socket 瞬时错误恢复后不再立刻弹服务不可用提示', async () => {
        vi.useFakeTimers();
        let statusCallback: ((status: { connected: boolean; lastError?: string }) => void) | null = null;
        vi.mocked(lobbySocket.subscribeStatus).mockImplementationOnce((callback) => {
            statusCallback = callback;
            return () => {};
        });

        render(createElement(GameDetailsModal, baseProps));

        statusCallback?.({ connected: false, lastError: 'websocket error' });
        expect(toastMock.error).not.toHaveBeenCalled();

        statusCallback?.({ connected: true });
        vi.advanceTimersByTime(1600);

        expect(toastMock.error).not.toHaveBeenCalled();
    });
});

describe('localSession helpers', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('ensureLocalMatchSeedSearchParams 会补 seed 且保留原参数', () => {
        const search = ensureLocalMatchSeedSearchParams(new URLSearchParams('players=2&seat1=local-ai'), 'seed-fixed');

        expect(search.get('players')).toBe('2');
        expect(search.get('seat1')).toBe('local-ai');
        expect(search.get('seed')).toBe('seed-fixed');
    });

    it('persist/read/clear local snapshot 正常工作', () => {
        const state = {
            core: { turn: 3 },
            sys: { phase: 'main' },
        } as any;

        persistLocalMatchSnapshot({
            gameId: 'dicethrone',
            seed: 'seed-1',
            numPlayers: 2,
            state,
            randomCursor: 7,
        });

        expect(readLocalMatchSnapshot({
            gameId: 'dicethrone',
            seed: 'seed-1',
            numPlayers: 2,
        })).toMatchObject({
            gameId: 'dicethrone',
            seed: 'seed-1',
            numPlayers: 2,
            randomCursor: 7,
            state,
        });

        expect(readLocalMatchSnapshot({
            gameId: 'dicethrone',
            seed: 'seed-1',
            numPlayers: 3,
        })).toBeNull();

        clearLocalMatchSnapshot('dicethrone', 'seed-1');

        expect(readLocalMatchSnapshot({
            gameId: 'dicethrone',
            seed: 'seed-1',
            numPlayers: 2,
        })).toBeNull();
    });
});

describe('RoomList lobby loading state', () => {
    const baseProps = {
        roomItems: [],
        activeMatch: null,
        isActionLoading: false,
        isLobbyLoading: false,
        onJoinRoom: vi.fn(),
        onJoinRequest: vi.fn(),
        onAction: vi.fn(),
        onForceExitLocal: vi.fn(),
        onOpenCreateRoom: vi.fn(),
        onSpectate: vi.fn(),
    };

    it('首帧加载期间显示 loading 而不是空状态', () => {
        render(createElement(RoomList, { ...baseProps, isLobbyLoading: true }));

        expect(screen.getByText('rooms.loading')).toBeInTheDocument();
        expect(screen.queryByText('rooms.empty')).toBeNull();
    });

    it('加载完成后空列表显示暂无房间', () => {
        render(createElement(RoomList, baseProps));

        expect(screen.getByText('rooms.empty')).toBeInTheDocument();
        expect(screen.queryByText('rooms.loading')).toBeNull();
    });
});
