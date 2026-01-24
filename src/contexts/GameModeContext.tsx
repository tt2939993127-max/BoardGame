import React, { createContext, useContext, useEffect } from 'react';

export type GameMode = 'local' | 'online' | 'tutorial';

export interface GameModeState {
    mode: GameMode;
    isMultiplayer: boolean;
}

const GameModeContext = createContext<GameModeState | undefined>(undefined);

export const GameModeProvider: React.FC<{ mode: GameMode; children: React.ReactNode }> = ({ mode, children }) => {
    const isMultiplayer = mode === 'online';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        (window as Window & { __BG_GAME_MODE__?: GameMode }).__BG_GAME_MODE__ = mode;
        return () => {
            const holder = window as Window & { __BG_GAME_MODE__?: GameMode };
            if (holder.__BG_GAME_MODE__ === mode) {
                holder.__BG_GAME_MODE__ = undefined;
            }
        };
    }, [mode]);

    return (
        <GameModeContext.Provider value={{ mode, isMultiplayer }}>
            {children}
        </GameModeContext.Provider>
    );
};

export const useGameMode = () => useContext(GameModeContext);
