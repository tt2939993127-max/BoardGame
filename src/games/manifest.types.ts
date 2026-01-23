export type GameManifestType = 'game' | 'tool';

export type GameCategory = 'strategy' | 'casual' | 'party' | 'abstract' | 'tools';

export interface GameManifestEntry {
    id: string;
    type: GameManifestType;
    enabled: boolean;
    titleKey: string;
    descriptionKey: string;
    category: GameCategory;
    playersKey: string;
    icon: string;
}
