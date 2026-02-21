export type GameManifestType = 'game' | 'tool';

export type GameCategory = 'card' | 'dice' | 'abstract' | 'wargame' | 'casual' | 'tools';

export interface GameManifestEntry {
    id: string;
    type: GameManifestType;
    enabled: boolean;
    titleKey: string;
    descriptionKey: string;
    category: GameCategory;
    playersKey: string;
    icon: string;
    /** 缩略图资源路径（不含扩展名，可指向 compressed 目录） */
    thumbnailPath?: string;
    /** 是否允许本地同屏模式，默认 true */
    allowLocalMode?: boolean;
    /** 可选的玩家人数列表，默认 [2] */
    playerOptions?: number[];
    /** 游戏标签，用于替代单一分类显示 */
    tags?: string[];
    /** 最佳游玩人数配置 */
    bestPlayers?: number[];
    /** 关键图片路径列表（相对于 /assets/），进入对局前必须加载完成 */
    criticalImages?: string[];
    /** 暖加载图片路径列表（相对于 /assets/），进入对局后后台预取 */
    warmImages?: string[];
    /** 游戏光标主题 ID（对应 src/core/cursor/themes.ts 中的注册表） */
    cursorTheme?: string;
    /** 游戏专属字体（自托管在 public/fonts/，@font-face 在 src/fonts.css） */
    fontFamily?: {
        /** 标题/装饰字体（英雄名、阶段名、卡牌标题等） */
        display: string;
        /** 正文字体（卡牌描述、规则提示等），不填则用全局默认 */
        body?: string;
    };
}
