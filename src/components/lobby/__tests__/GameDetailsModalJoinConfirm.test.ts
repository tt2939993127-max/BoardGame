/* @vitest-environment happy-dom */
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLocalMatchSearchParams, resolveSeatControllersFromSearchParams } from '../../../engine/ai';
import { AiSupportPills } from '../AiSupportPills';
import { resolveActiveMatchExitPayload, shouldPromptExitActiveMatch } from '../roomActions';
import { RoomList } from '../RoomList';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
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
    vi.clearAllMocks();
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
        expect(controllers['1']).toEqual({ type: 'local-ai' });
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
                '1': { type: 'local-ai', policyId: 'opening-v1' },
                '2': { type: 'remote-ai', providerId: 'astrbot' },
            },
        });

        expect(search.get('players')).toBe('3');
        expect(search.get('seat1')).toBe('local-ai:opening-v1');
        expect(search.get('seat2')).toBe('remote-ai:astrbot');
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
