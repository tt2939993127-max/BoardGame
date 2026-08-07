import { describe, expect, it } from 'vitest';
import {
    BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS,
    BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS,
    BETRAYAL_CONFIG_REVIEW_TABLE_ID,
    BETRAYAL_CONFIG_REVIEW_VERSION,
    buildBetrayalConfigReviewTable,
    getBetrayalConfigReviewCellValue,
    isBetrayalConfigReviewFieldApplicable,
    rotateBetrayalRoomDoorways,
} from '../config/configReviewAdapter';

describe('Betrayal configReviewAdapter', () => {
    it('从小黑屋正式 TypeScript 配置产出配置审查表', () => {
        const table = buildBetrayalConfigReviewTable();

        expect(table.tableId).toBe(BETRAYAL_CONFIG_REVIEW_TABLE_ID);
        expect(table.gameId).toBe('betrayal');
        expect(table.configVersion).toBe(BETRAYAL_CONFIG_REVIEW_VERSION);
        expect(table.rows.length).toBeGreaterThan(50);
        expect(table.rows.some((row) => row.objectType === 'room-template')).toBe(true);
        expect(table.rows.some((row) => row.objectType === 'scenario-card')).toBe(true);
        expect(table.rows.some((row) => row.objectType === 'scenario-config')).toBe(true);
    });

    it('显式暴露房间门位、旋转后门位和连通校验字段', () => {
        const table = buildBetrayalConfigReviewTable();
        const kitchen = table.rows.find((row) => row.objectId === 'ground:kitchen');
        const hallway = table.rows.find((row) => row.objectId === 'hallway');

        expect(kitchen).toBeDefined();
        expect(kitchen?.values).toMatchObject({
            floor: '一层',
            visualId: 'kitchen',
            atlasFrame: 5,
            discoverySymbol: 'event',
            doorways: ['东', '南', '西'],
            connectionStatus: '放置时必须至少一扇旋转后门位连通入口门',
        });
        expect(kitchen?.values.rotatedDoorways).toEqual(expect.arrayContaining([
            '0转：东、南、西',
            '1转：南、西、北',
            '2转：西、北、东',
            '3转：北、东、南',
        ]));

        expect(hallway?.values.connectionStatus).toBe('连接清单与门位一致');
        expect(hallway?.values.doorways).toEqual(expect.arrayContaining([
            '西 → grand-staircase',
            '东 → entrance-hall',
            '北 → ground-north',
            '南 → ground-south',
        ]));
    });

    it('旋转门位计算以顺时针四向为唯一规则', () => {
        expect(rotateBetrayalRoomDoorways(['north', 'east', 'south'], 1)).toEqual(['east', 'south', 'west']);
        expect(rotateBetrayalRoomDoorways(['north', 'east', 'south'], 2)).toEqual(['south', 'west', 'north']);
        expect(rotateBetrayalRoomDoorways(['north', 'east', 'south'], 3)).toEqual(['west', 'north', 'east']);
    });

    it('剧本候选和运行剧本配置进入同一配置表，但不冒充完整作祟实现', () => {
        const table = buildBetrayalConfigReviewTable();
        const mummy = table.rows.find((row) => row.objectId === 'mummy-rampage');
        const bloodFromStone = table.rows.find((row) => row.objectId === 'blood-from-a-stone');
        const firstScenario = table.rows.find((row) => row.objectId === 'first-scenario');
        const hauntFive = table.rows.find((row) => row.objectId === 'haunt-5');

        expect(mummy).toMatchObject({
            objectType: 'scenario-card',
            displayName: '木乃伊横行',
        });
        expect(mummy?.values).toMatchObject({
            hauntNumber: 1,
            triggerOmenLabel: '女孩',
            implementationStatus: 'implemented',
            reviewStatus: 'locked',
        });

        expect(bloodFromStone?.values).toMatchObject({
            hauntNumber: 5,
            implementationStatus: 'runtime-supported',
            reviewStatus: 'representative-only',
        });
        expect(firstScenario?.values).toMatchObject({
            hauntId: 'mummy-rampage',
            runtimeObjective: '恶兆前探索',
            hauntObjective: '找出真名、学习驱逐法术并驱逐木乃伊',
        });
        expect(hauntFive?.values.runtimeSupport).toContain('具体机制仍由 game.ts 代码 Module 承接');
    });

    it('字段清单驱动值读取、适用对象和反馈路径', () => {
        const table = buildBetrayalConfigReviewTable();
        const kitchen = table.rows.find((row) => row.objectId === 'ground:kitchen');
        const scenario = table.rows.find((row) => row.objectId === 'mummy-rampage');

        expect(kitchen).toBeDefined();
        expect(scenario).toBeDefined();
        if (!kitchen || !scenario) return;

        expect(getBetrayalConfigReviewCellValue(kitchen, 'doorways')).toEqual(['东', '南', '西']);
        expect(isBetrayalConfigReviewFieldApplicable(kitchen, 'doorways')).toBe(true);
        expect(isBetrayalConfigReviewFieldApplicable(kitchen, 'hauntNumber')).toBe(false);
        expect(isBetrayalConfigReviewFieldApplicable(scenario, 'hauntNumber')).toBe(true);
        expect(isBetrayalConfigReviewFieldApplicable(scenario, 'doorways')).toBe(false);

        const requiredFields = BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS.filter((definition) => definition.requiredForAudit);
        expect(requiredFields.filter((definition) => definition.evidence.length === 0)).toEqual([]);
        for (const definition of requiredFields) {
            expect(BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS).toContain(definition.key);
        }
        expect(kitchen.fieldPaths.doorways).toBe(
            'legacy.betrayal.scenarioConfig.BETRAYAL_DISCOVERY_POOLS.roomDiscoveryByFloor.ground.kitchen.doorways',
        );
    });
});
