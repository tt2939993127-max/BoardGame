import React from 'react';
import type { UndoAwareState } from '../../games/common/UndoManager';

interface GameControlsProps {
    G: UndoAwareState & any;
    ctx: any;
    moves: any;
    playerID: string | null;
}

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, playerID }) => {
    if (!playerID) return null; // Spectator or unconnected

    const history = G.sys?.history || [];
    const request = G.sys?.undoRequest;

    // In our logic:
    // - The 'waiting' player (previous turn) wants to undo -> canRequest
    // - The 'active' player (current turn) needs to approve -> canReview

    // Check if playing locally (no specific playerID bound usually means hotseat, 
    // but in boardgame.io online, everyone has a specific ID)
    const isCurrentPlayer = playerID === ctx.currentPlayer;

    // Request Logic:
    // You can request undo if:
    // 1. History exists
    // 2. No active request exists
    // 3. You are NOT the current player (meaning it's opponent's turn, so you want to undo your last move)
    const canRequest = history.length > 0 && !request && !isCurrentPlayer;

    // Review Logic:
    // You can review if:
    // 1. There is a request
    // 2. You didn't make the request
    // 3. You ARE the current player (you control the board now)
    const canReview = !!request && request.requester !== playerID && isCurrentPlayer;

    // Check if player is the requester (to show waiting status)
    const isRequester = request?.requester === playerID;

    if (isRequester) {
        return (
            <div className="flex items-center gap-4 bg-neon-void/90 border border-neon-blue/50 p-4 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.3)] animate-pulse">
                <span className="text-neon-blue font-mono text-sm tracking-wider animate-pulse">
                    等待批准中...
                </span>
                <button
                    onClick={() => moves.cancelRequest()}
                    className="px-3 py-1 bg-transparent border border-white/20 hover:bg-white/10 text-xs text-white/70 rounded transition-colors"
                >
                    取消
                </button>
            </div>
        );
    }

    if (canReview) {
        return (
            <div className="flex flex-col md:flex-row items-center gap-4 bg-neon-grid p-4 rounded-lg border border-neon-pink shadow-[0_0_20px_rgba(188,19,254,0.4)]">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-pink animate-ping"></span>
                    <span className="text-white font-bold text-sm tracking-wide">
                        对手请求撤销
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => moves.approveUndo()}
                        className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue hover:text-black border border-neon-blue text-neon-blue rounded text-xs font-bold tracking-widest transition-all"
                    >
                        接受
                    </button>
                    <button
                        onClick={() => moves.rejectUndo()}
                        className="px-4 py-2 bg-neon-pink/20 hover:bg-neon-pink hover:text-white border border-neon-pink text-neon-pink rounded text-xs font-bold tracking-widest transition-all"
                    >
                        拒绝
                    </button>
                </div>
            </div>
        );
    }

    // Default: Show Undo Request Button
    // Only show if we can request (history > 0 and correct stage)
    if (canRequest) {
        return (
            <button
                onClick={() => moves.requestUndo()}
                className="group relative px-6 py-2 overflow-hidden rounded border border-white/10 bg-neon-void hover:border-neon-blue/50 transition-all"
            >
                <div className="absolute inset-0 bg-neon-blue/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center gap-2 text-white/60 group-hover:text-neon-blue font-mono text-xs tracking-[0.2em] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    撤销操作
                </span>
            </button>
        );
    }

    return null;
};
