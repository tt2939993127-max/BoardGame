import type { GameManifestEntry } from '../manifest.types';
import { CARDIA_IMAGE_PATHS } from './imagePaths';
const entry: GameManifestEntry = {
    id: 'cardia',
    type: 'game',
    enabled: true,
    titleKey: 'games.cardia.title',
    descriptionKey: 'games.cardia.description',
    category: 'card',
    playersKey: 'games.cardia.players',
    icon: '🏰',
    thumbnailPath: CARDIA_IMAGE_PATHS.THUMBNAIL_TITLE,
    allowLocalMode: false,
    playerOptions: [2],
    tags: ['card_driven', 'tactical'],
    bestPlayers: [2],
    cursorTheme: 'cardia',
    mobileLandscapeLayout: 'responsive',
    setupOptions: {
        deckVariant: {
            type: 'select',
            labelKey: 'games.cardia.setup.deckVariant.label',
            options: [
                { value: 'I', labelKey: 'games.cardia.setup.deckVariant.deck1' },
                { value: 'II', labelKey: 'games.cardia.setup.deckVariant.deck2' },
            ],
            default: 'I',
        },
    },
    // 移动端预算：不再全量 preload 卡牌图片。
    // 首屏只保证背景/标题等 P0 资源，卡牌图由 CriticalImageGate（critical/warm）分阶段加载。
    preloadAssets: {
        images: [
            // P0：标题和辅助图片（用于列表页/入口页/基础 UI）
            CARDIA_IMAGE_PATHS.THUMBNAIL_TITLE,
            CARDIA_IMAGE_PATHS.HELPER_1,
            CARDIA_IMAGE_PATHS.HELPER_2,
        ],
    },
};

export const CARDIA_MANIFEST: GameManifestEntry = entry;
export default entry;
