import type { Game } from 'boardgame.io';
import type { GameManifestEntry } from './manifest.types';

export interface GameServerManifestEntry {
    manifest: GameManifestEntry;
    game: Game;
}
