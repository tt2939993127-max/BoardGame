import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobileBattlefieldViewport, MobileBoardShell } from '../MobileBoardShell';

describe('MobileBoardShell', () => {
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
});
