import type { GameManifestEntry } from '../manifest.types';

const entry: GameManifestEntry = {
    id: 'ugcbuilder',
    type: 'tool',
    enabled: true,
    titleKey: 'games.ugcbuilder.title',
    descriptionKey: 'games.ugcbuilder.description',
    category: 'tools',
    playersKey: 'games.ugcbuilder.players',
    icon: '🧩',
};

export const UGC_BUILDER_MANIFEST: GameManifestEntry = entry;

export default entry;
