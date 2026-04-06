import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { createAuthoringDocument } from '../../../../../src/ui-scene/compiler';
import type { UISceneAuthoringSavePayload } from '../../../../../src/ui-scene/types';

export type LayoutSaveResult = {
    filePath: string;
    relativePath: string;
    bytes: number;
};

export type UISceneAuthoringSceneId = 'home-v2';

export type UISceneAuthoringSaveResult = LayoutSaveResult & {
    sceneId: UISceneAuthoringSceneId;
    compiledFilePath: string;
    compiledRelativePath: string;
    compiledBytes: number;
};

export type AbilitySlotLayoutItem = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

export type DiceThroneAbilityLayoutVersion = 'v1' | 'v2';

export type DiceThroneAbilityLayoutsPayload = {
    layouts: Record<DiceThroneAbilityLayoutVersion, AbilitySlotLayoutItem[]>;
};

@Injectable()
export class LayoutService {
    private readonly baseDir: string;
    private readonly fileName = 'summonerwars.layout.json';
    private readonly repoRoot: string;
    private readonly abilityLayoutPath: string;
    private readonly uiSceneRootPath: string;

    constructor() {
        const cwd = process.cwd();
        const marker = `${sep}apps${sep}api`;
        const markerIndex = cwd.lastIndexOf(marker);
        this.repoRoot = markerIndex >= 0 ? cwd.slice(0, markerIndex) : cwd;
        const envDir = process.env.LAYOUT_DATA_DIR?.trim();
        if (envDir) {
            this.baseDir = resolve(cwd, envDir);
        } else {
            this.baseDir = resolve(this.repoRoot, 'public/game-data');
        }
        const envAbilityPath = process.env.DICETHRONE_ABILITY_LAYOUT_PATH?.trim();
        this.abilityLayoutPath = envAbilityPath
            ? resolve(cwd, envAbilityPath)
            : resolve(this.repoRoot, 'src/games/dicethrone/ui/abilitySlotLayout.ts');
        const envUiSceneRootPath = process.env.UI_SCENE_ROOT_PATH?.trim();
        this.uiSceneRootPath = envUiSceneRootPath
            ? resolve(cwd, envUiSceneRootPath)
            : resolve(this.repoRoot, 'src/ui-scenes');
    }

    async saveSummonerWarsLayout(config: Record<string, unknown>): Promise<LayoutSaveResult> {
        if (!config || typeof config !== 'object') {
            throw new Error('layoutConfig.invalid');
        }
        await mkdir(this.baseDir, { recursive: true });
        const filePath = resolve(this.baseDir, this.fileName);
        const content = JSON.stringify(config, null, 2);
        await writeFile(filePath, content, 'utf8');
        return {
            filePath,
            relativePath: this.toRelativePath(filePath),
            bytes: Buffer.byteLength(content, 'utf8'),
        };
    }

    async saveDiceThroneAbilityLayout(payload: DiceThroneAbilityLayoutsPayload): Promise<LayoutSaveResult> {
        if (!payload || typeof payload !== 'object' || !payload.layouts) {
            throw new Error('layoutConfig.invalid');
        }
        const content = this.buildDiceThroneAbilityLayoutFile(payload.layouts);
        await mkdir(dirname(this.abilityLayoutPath), { recursive: true });
        await writeFile(this.abilityLayoutPath, content, 'utf8');
        return {
            filePath: this.abilityLayoutPath,
            relativePath: this.toRelativePath(this.abilityLayoutPath),
            bytes: Buffer.byteLength(content, 'utf8'),
        };
    }

    async saveUiSceneAuthoring(
        sceneId: UISceneAuthoringSceneId,
        payload: UISceneAuthoringSavePayload,
    ): Promise<UISceneAuthoringSaveResult> {
        const files = this.resolveUiSceneFiles(sceneId);
        const authoringDocument = createAuthoringDocument({
            sceneId,
            assetRegistryFile: files.assetRegistryRelativePath,
            assetRegistryYaml: payload.assetRegistryYaml,
            skinFile: files.skinRelativePath,
            skinYaml: payload.skinYaml,
            sceneFile: files.sceneRelativePath,
            sceneYaml: payload.sceneYaml,
        });

        const compiledJson = `${JSON.stringify(authoringDocument.compiled, null, 2)}\n`;
        await mkdir(files.directoryPath, { recursive: true });
        await writeFile(files.assetRegistryPath, payload.assetRegistryYaml, 'utf8');
        await writeFile(files.skinPath, payload.skinYaml, 'utf8');
        await writeFile(files.scenePath, payload.sceneYaml, 'utf8');
        await writeFile(files.compiledPath, compiledJson, 'utf8');

        return {
            sceneId,
            filePath: files.scenePath,
            relativePath: files.sceneRelativePath,
            bytes: Buffer.byteLength(payload.sceneYaml, 'utf8'),
            compiledFilePath: files.compiledPath,
            compiledRelativePath: files.compiledRelativePath,
            compiledBytes: Buffer.byteLength(compiledJson, 'utf8'),
        };
    }

    private buildDiceThroneAbilityLayoutFile(layouts: Record<DiceThroneAbilityLayoutVersion, AbilitySlotLayoutItem[]>) {
        const versions: DiceThroneAbilityLayoutVersion[] = ['v1', 'v2'];
        const hasInvalidVersion = versions.some((version) => !Array.isArray(layouts[version]) || layouts[version].length === 0);
        if (hasInvalidVersion) {
            throw new Error('layoutConfig.invalid');
        }

        const renderLayout = (items: AbilitySlotLayoutItem[]) => items.map((slot) => {
            const x = this.formatSlotValue(slot.x);
            const y = this.formatSlotValue(slot.y);
            const w = this.formatSlotValue(slot.w);
            const h = this.formatSlotValue(slot.h);
            return `    { id: '${slot.id}', x: ${x}, y: ${y}, w: ${w}, h: ${h} },`;
        }).join('\n');

        return `import type { CharacterId } from '../domain/types';

/**
 * DiceThrone 技能槽布局（游戏级配置）
 * - 使用百分比坐标，基于玩家面板图片
 * - 所有角色显式声明使用的布局版本
 */
export interface AbilitySlotLayoutItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export type DiceThronePlayerBoardLayoutVersion = 'v1' | 'v2';

type PlayerBoardDimensions = {
    width: number;
    height: number;
};

type PlayerBoardUiTuning = {
    shellTranslateX: number;
    playerBoardTranslateY: number;
    magnifyButtonTop: number;
};

const V1_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
${renderLayout(layouts.v1)}
];

// v2 面板来自枪手 / 武士图片裁图坐标，顶部留白显著增加。
const V2_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
${renderLayout(layouts.v2)}
];

export const DICETHRONE_PLAYER_BOARD_LAYOUTS: Record<DiceThronePlayerBoardLayoutVersion, AbilitySlotLayoutItem[]> = {
    v1: V1_ABILITY_SLOT_LAYOUT,
    v2: V2_ABILITY_SLOT_LAYOUT,
};

export const DEFAULT_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = DICETHRONE_PLAYER_BOARD_LAYOUTS.v1;

export const DICETHRONE_PLAYER_BOARD_DIMENSIONS: Record<string, PlayerBoardDimensions> = {
    barbarian: { width: 2048, height: 1675 },
    gunslinger: { width: 2048, height: 1254 },
    monk: { width: 2048, height: 1673 },
    moon_elf: { width: 2048, height: 1670 },
    paladin: { width: 2048, height: 1680 },
    pyromancer: { width: 2048, height: 1674 },
    samurai: { width: 2048, height: 1248 },
    shadow_thief: { width: 2048, height: 1686 },
};

export const DICETHRONE_PLAYER_BOARD_LAYOUT_VERSION_BY_CHARACTER: Record<string, DiceThronePlayerBoardLayoutVersion> = {
    monk: 'v1',
    barbarian: 'v1',
    pyromancer: 'v1',
    moon_elf: 'v1',
    shadow_thief: 'v1',
    paladin: 'v1',
    gunslinger: 'v2',
    samurai: 'v2',
};

const DICETHRONE_PLAYER_BOARD_UI_TUNING: Record<DiceThronePlayerBoardLayoutVersion, PlayerBoardUiTuning> = {
    v1: {
        shellTranslateX: 0,
        playerBoardTranslateY: 0,
        magnifyButtonTop: 0.48,
    },
    v2: {
        shellTranslateX: 1.1,
        playerBoardTranslateY: -1.45,
        magnifyButtonTop: 1.85,
    },
};

export const getPlayerBoardLayoutVersion = (characterId?: string | null): DiceThronePlayerBoardLayoutVersion => (
    DICETHRONE_PLAYER_BOARD_LAYOUT_VERSION_BY_CHARACTER[characterId ?? ''] ?? 'v1'
);

export const getAbilitySlotLayoutByVersion = (version: DiceThronePlayerBoardLayoutVersion): AbilitySlotLayoutItem[] => (
    DICETHRONE_PLAYER_BOARD_LAYOUTS[version]
);

export const getAbilitySlotLayoutForCharacter = (characterId?: CharacterId | string | null): AbilitySlotLayoutItem[] => (
    getAbilitySlotLayoutByVersion(getPlayerBoardLayoutVersion(characterId))
);

export const getPlayerBoardDimensions = (characterId?: CharacterId | string | null): PlayerBoardDimensions => (
    DICETHRONE_PLAYER_BOARD_DIMENSIONS[characterId ?? ''] ?? DICETHRONE_PLAYER_BOARD_DIMENSIONS.monk
);

export const getPlayerBoardAspectRatio = (characterId?: CharacterId | string | null): number => {
    const { width, height } = getPlayerBoardDimensions(characterId);
    return width / height;
};

export const getPlayerBoardUiTuning = (characterId?: CharacterId | string | null): PlayerBoardUiTuning => (
    DICETHRONE_PLAYER_BOARD_UI_TUNING[getPlayerBoardLayoutVersion(characterId)]
);
`;
    }

    private formatSlotValue(value: number) {
        if (!Number.isFinite(value)) return '0';
        return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }

    private toRelativePath(filePath: string) {
        const root = process.cwd();
        if (filePath.startsWith(root)) {
            return filePath.slice(root.length + 1);
        }
        return filePath;
    }

    private resolveUiSceneFiles(sceneId: UISceneAuthoringSceneId) {
        if (sceneId !== 'home-v2') {
            throw new Error(`uiScene.unsupported:${sceneId}`);
        }

        const directoryPath = resolve(this.uiSceneRootPath, sceneId);
        const assetRegistryPath = resolve(directoryPath, 'asset-registry.yaml');
        const skinPath = resolve(directoryPath, `${sceneId}.skin.yaml`);
        const scenePath = resolve(directoryPath, `${sceneId}.ui.yaml`);
        const compiledPath = resolve(directoryPath, `${sceneId}.compiled.json`);

        return {
            directoryPath,
            assetRegistryPath,
            skinPath,
            scenePath,
            compiledPath,
            assetRegistryRelativePath: this.toRelativePath(assetRegistryPath),
            skinRelativePath: this.toRelativePath(skinPath),
            sceneRelativePath: this.toRelativePath(scenePath),
            compiledRelativePath: this.toRelativePath(compiledPath),
        };
    }
}
