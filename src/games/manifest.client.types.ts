import type { ReactNode } from 'react';
import type { Game } from 'boardgame.io';
import type { BoardProps } from 'boardgame.io/react';
import type { TutorialManifest } from '../contexts/TutorialContext';
import type { GameManifestEntry } from './manifest.types';

export interface GameClientManifestEntry {
    manifest: GameManifestEntry;
    thumbnail: ReactNode;
    game?: Game;
    board?: React.ComponentType<BoardProps>;
    tutorial?: TutorialManifest;
}
