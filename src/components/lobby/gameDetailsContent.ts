import type { GameManifestEntry } from '../../games/manifest.types';

export interface GameChangelogItem {
    id: string;
    gameId: string;
    title: string;
    versionLabel?: string | null;
    content: string;
    published: boolean;
    pinned: boolean;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const DEFAULT_AUTHOR_NAME = '佚名';

export const resolveGameAuthorName = (
    manifest?: Pick<GameManifestEntry, 'authorName'> | null,
    fallback = DEFAULT_AUTHOR_NAME,
) => {
    const normalized = manifest?.authorName?.trim();
    return normalized || fallback;
};
