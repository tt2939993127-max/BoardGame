import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MobileBattlefieldViewport, MobileBoardShell } from '../MobileBoardShell';

describe('MobileBoardShell', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: 900,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            writable: true,
            value: 500,
        });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: originalInnerWidth,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            writable: true,
            value: originalInnerHeight,
        });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
    });

    it('renders canvas content inside the constrained shell wrapper and optional rails', () => {
        const { container } = render(
            <MobileBoardShell
                topRail={<div>top</div>}
                sideDock={<div>side</div>}
                bottomRail={<div>bottom</div>}
            >
                <div>board</div>
            </MobileBoardShell>,
        );

        expect(screen.getByText('board')).toBeInTheDocument();
        expect(screen.getByText('top')).toBeInTheDocument();
        expect(screen.getByText('side')).toBeInTheDocument();
        expect(screen.getByText('bottom')).toBeInTheDocument();
        expect(container.querySelector('.mobile-board-shell__content')).not.toBeNull();
    });

    it('exposes battlefield zoom ownership on the shell', () => {
        render(
            <MobileBoardShell battlefieldZoomMode="shell-pinch-pan">
                <div>board</div>
            </MobileBoardShell>,
        );

        const shell = document.querySelector('.mobile-board-shell');
        expect(shell?.getAttribute('data-battlefield-zoom-mode')).toBe('shell-pinch-pan');
    });

    it('renders a dedicated battlefield viewport stage for pinch-pan capable games', () => {
        render(
            <MobileBattlefieldViewport zoomMode="shell-pinch-pan" testId="battlefield">
                <div>board</div>
            </MobileBattlefieldViewport>,
        );

        expect(screen.getByTestId('battlefield')).toBeInTheDocument();
        expect(screen.getByTestId('battlefield-stage')).toBeInTheDocument();
    });

    it('can target pinch-pan transforms directly on the marked content layer without adding a stage wrapper', async () => {
        render(
            <MobileBattlefieldViewport
                zoomMode="shell-pinch-pan"
                transformTarget="content"
                testId="battlefield"
            >
                <div data-testid="battlefield-target" data-mobile-battlefield-zoom-target="true">
                    board
                </div>
            </MobileBattlefieldViewport>,
        );

        const viewport = screen.getByTestId('battlefield');

        await waitFor(() => {
            expect(viewport.getAttribute('data-battlefield-zoom-target-mode')).toBe('content');
        });

        expect(screen.queryByTestId('battlefield-stage')).toBeNull();

        act(() => {
            fireEvent.pointerDown(viewport, {
                pointerId: 1,
                pointerType: 'touch',
                clientX: 120,
                clientY: 120,
            });
            fireEvent.pointerDown(viewport, {
                pointerId: 2,
                pointerType: 'touch',
                clientX: 220,
                clientY: 120,
            });
        });

        act(() => {
            fireEvent.pointerMove(viewport, {
                pointerId: 1,
                pointerType: 'touch',
                clientX: 80,
                clientY: 120,
            });
            fireEvent.pointerMove(viewport, {
                pointerId: 2,
                pointerType: 'touch',
                clientX: 260,
                clientY: 120,
            });
        });

        expect(Number(viewport.getAttribute('data-battlefield-zoom-scale') ?? '1')).toBeGreaterThan(1);
        const target = screen.getByTestId('battlefield-target');
        expect(target.style.transform).toContain('scale(');
    });

    it('updates battlefield scale when a two-finger touch pointer gesture moves apart on mobile landscape', () => {
        render(
            <MobileBattlefieldViewport zoomMode="shell-pinch-pan" testId="battlefield">
                <div>board</div>
            </MobileBattlefieldViewport>,
        );

        const viewport = screen.getByTestId('battlefield');
        const stage = screen.getByTestId('battlefield-stage');
        expect(viewport.getAttribute('data-battlefield-zoom-scale')).toBe('1.000');

        act(() => {
            fireEvent.pointerDown(viewport, {
                pointerId: 1,
                pointerType: 'touch',
                clientX: 120,
                clientY: 120,
            });
            fireEvent.pointerDown(viewport, {
                pointerId: 2,
                pointerType: 'touch',
                clientX: 220,
                clientY: 120,
            });
        });

        act(() => {
            fireEvent.pointerMove(viewport, {
                pointerId: 1,
                pointerType: 'touch',
                clientX: 80,
                clientY: 120,
            });
            fireEvent.pointerMove(viewport, {
                pointerId: 2,
                pointerType: 'touch',
                clientX: 260,
                clientY: 120,
            });
        });

        expect(Number(viewport.getAttribute('data-battlefield-zoom-scale') ?? '1')).toBeGreaterThan(1);
        expect(viewport.getAttribute('data-battlefield-touch-mode')).toBe('gesture-lock');
        expect(stage.style.transform).toContain('scale(');
    });
});
