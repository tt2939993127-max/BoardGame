import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import {
    GAME_PAGE_RESCUE_GRACE_MS,
    detectGamePageRescueSignal,
} from '../GamePageRescueGate';
import { ViewportDebugProbe } from '../ViewportDebugProbe';
import {
    BOARD_ERROR_BOUNDARY_MAX_RETRIES,
    isBoardRenderErrorRecoverable,
    shouldShowBoardRenderFallback,
} from '../../../engine/transport/react';
import {
    PLAY_ROUTE_LOADING_TIMEOUT_MS,
    resolvePlayRouteFallbackLobbyPath,
    shouldShowPlayRouteLoadingPrompt,
} from '../../../lib/gameRouteFallback';

// Mock Dependencies
vi.mock('react', async () => {
    const actual = await vi.importActual<any>('react');
    return {
        ...actual,
        Component: class extends actual.Component<any, any> {
            constructor(props: any) {
                super(props);
                this.state = {};
            }
            setState(state: any) {
                this.state = { ...this.state, ...state };
            }
        },
    };
});

describe('GlobalErrorBoundary', () => {
    it('Should be a React Component class', () => {
        expect(GlobalErrorBoundary).toBeDefined();
        // Since it's a class component
        expect(GlobalErrorBoundary.prototype).toBeDefined();
        // Check if it has the required lifecycle method
        expect(typeof GlobalErrorBoundary.getDerivedStateFromError).toBe('function');
    });

    it('getDerivedStateFromError should update state to hasError: true', () => {
        const error = new Error('Test Error');
        const state = GlobalErrorBoundary.getDerivedStateFromError(error);
        expect(state).toEqual({ hasError: true, error, errorInfo: null });
    });
});

describe('ViewportDebugProbe', () => {
    it('未带调试参数时不渲染', () => {
        render(
            <MemoryRouter initialEntries={['/play/dicethrone/local']}>
                <ViewportDebugProbe />
            </MemoryRouter>,
        );

        expect(screen.queryByTestId('viewport-debug-probe')).toBeNull();
    });

    it('带调试参数时渲染诊断浮层', () => {
        render(
            <MemoryRouter initialEntries={['/play/dicethrone/local?bgViewportDebug=1']}>
                <ViewportDebugProbe />
            </MemoryRouter>,
        );

        expect(screen.getByTestId('viewport-debug-probe')).toBeInTheDocument();
        expect(screen.getByText('真机视口诊断')).toBeInTheDocument();
    });
});

describe('BoardErrorBoundary helpers', () => {
    it('仅对可恢复的上下文类错误继续显示 loading fallback', () => {
        expect(isBoardRenderErrorRecoverable(new Error('AudioProvider not ready'))).toBe(true);
        expect(isBoardRenderErrorRecoverable(new Error('useAudio hook missing provider'))).toBe(true);
        expect(isBoardRenderErrorRecoverable(new Error('Context value is undefined'))).toBe(true);
        expect(isBoardRenderErrorRecoverable(new Error('Cannot read properties of undefined'))).toBe(false);
    });

    it('超过重试上限或错误不可恢复时不再显示黑色 loading fallback', () => {
        const fallback = <div>loading</div>;

        expect(shouldShowBoardRenderFallback({
            error: new Error('AudioProvider not ready'),
            retryCount: 0,
            fallback,
        })).toBe(true);

        expect(shouldShowBoardRenderFallback({
            error: new Error('AudioProvider not ready'),
            retryCount: BOARD_ERROR_BOUNDARY_MAX_RETRIES,
            fallback,
        })).toBe(false);

        expect(shouldShowBoardRenderFallback({
            error: new Error('Cannot read properties of undefined'),
            retryCount: 0,
            fallback,
        })).toBe(false);
    });
});

describe('GamePageRescueGate helpers', () => {
    it('在宽限期后检测到画布塌缩时切换到友好提示', () => {
        expect(detectGamePageRescueSignal({
            pathname: '/play/smashup/local',
            elapsedMs: GAME_PAGE_RESCUE_GRACE_MS + 1,
            hasFriendlyScreen: false,
            hasLoadingScreen: false,
            viewportRect: { width: 960, height: 540 },
            shellRect: { width: 960, height: 540 },
            contentRect: { width: 0, height: 0 },
            meaningfulContentCount: 0,
        })).toBe('game-shell-collapsed');
    });

    it('已有 loading 或友好页时不重复触发救援提示', () => {
        expect(detectGamePageRescueSignal({
            pathname: '/play/smashup/local',
            elapsedMs: GAME_PAGE_RESCUE_GRACE_MS + 1,
            hasFriendlyScreen: false,
            hasLoadingScreen: true,
            viewportRect: null,
            shellRect: null,
            contentRect: null,
            meaningfulContentCount: 0,
        })).toBeNull();

        expect(detectGamePageRescueSignal({
            pathname: '/play/smashup/local',
            elapsedMs: GAME_PAGE_RESCUE_GRACE_MS + 1,
            hasFriendlyScreen: true,
            hasLoadingScreen: false,
            viewportRect: null,
            shellRect: null,
            contentRect: null,
            meaningfulContentCount: 0,
        })).toBeNull();
    });
});

describe('Play route loading fallback helpers', () => {
    it('仅在对局路由超时后切换到友好提示', () => {
        expect(shouldShowPlayRouteLoadingPrompt('/play/smashup/local', PLAY_ROUTE_LOADING_TIMEOUT_MS - 1)).toBe(false);
        expect(shouldShowPlayRouteLoadingPrompt('/play/smashup/local', PLAY_ROUTE_LOADING_TIMEOUT_MS)).toBe(true);
        expect(shouldShowPlayRouteLoadingPrompt('/dev/audio', PLAY_ROUTE_LOADING_TIMEOUT_MS + 1)).toBe(false);
    });

    it('返回大厅路径优先带上当前 gameId', () => {
        expect(resolvePlayRouteFallbackLobbyPath('/play/smashup/local')).toBe('/?game=smashup');
        expect(resolvePlayRouteFallbackLobbyPath('/play/dicethrone/match/123')).toBe('/?game=dicethrone');
        expect(resolvePlayRouteFallbackLobbyPath('/maintenance')).toBe('/');
    });
});
