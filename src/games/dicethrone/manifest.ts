import type { GameManifestEntry } from '../manifest.types';

const entry: GameManifestEntry = {
    id: 'dicethrone',
    type: 'game',
    enabled: true,
    titleKey: 'games.dicethrone.title',
    descriptionKey: 'games.dicethrone.description',
    category: 'strategy',
    playersKey: 'games.dicethrone.players',
    icon: '🎲',
};

export const DICETHRONE_MANIFEST: GameManifestEntry = entry;

export default entry;
