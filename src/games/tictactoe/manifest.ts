import type { GameManifestEntry } from '../manifest.types';

const entry: GameManifestEntry = {
    id: 'tictactoe',
    type: 'game',
    enabled: true,
    titleKey: 'games.tictactoe.title',
    descriptionKey: 'games.tictactoe.description',
    category: 'strategy',
    playersKey: 'games.tictactoe.players',
    icon: '#',
};

export const TIC_TAC_TOE_MANIFEST: GameManifestEntry = entry;

export default entry;
