/* @vitest-environment happy-dom */
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
});

describe('GameDetailsModal join confirm helpers', () => {
    it('shouldPromptExitActiveMatch 有活跃对局且目标不同则返回 true', () => {
        expect(shouldPromptExitActiveMatch('match-1', 'match-2')).toBe(true);
    });

    it('shouldPromptExitActiveMatch 相同房间不提示', () => {
        expect(shouldPromptExitActiveMatch('match-1', 'match-1')).toBe(false);
    });

    it('resolveActiveMatchExitPayload 缺少凭证则返回 null', () => {
        const stored = buildStored({ credentials: '' });
        const result = resolveActiveMatchExitPayload('match-1', stored, null, 'dicethrone');
        expect(result).toBeNull();
    });

    it('resolveActiveMatchExitPayload 正常返回退出参数', () => {
        const stored = buildStored({ gameName: 'SmashUp', playerID: '0' });
        const result = resolveActiveMatchExitPayload('match-1', stored, null, 'dicethrone');
        expect(result).toEqual({
            gameName: 'smashup',
            playerID: '0',
            credentials: 'creds',
        });
    });

    it('resolveActiveMatchExitPayload 回退到 ownerActive 与 fallbackGameName', () => {
        const stored = buildStored({ gameName: '' });
        const result = resolveActiveMatchExitPayload(
            'match-1',
            stored,
            { matchID: 'match-1', gameName: 'SummonerWars' },
            'dicethrone'
        );
        expect(result?.gameName).toBe('summonerwars');
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

    it('首帧加载期间显示加载态而不是空状态', () => {
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
