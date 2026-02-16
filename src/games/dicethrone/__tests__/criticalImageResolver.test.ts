import { describe, it, expect } from 'vitest';
import { diceThroneCriticalImageResolver, _testExports } from '../criticalImageResolver';
import type { MatchState } from '../../../engine/types';
import type { DiceThroneCore } from '../domain/types';

const {
    CHARACTER_ASSET_TYPES,
    IMPLEMENTED_CHARACTERS,
    COMMON_CRITICAL_PATHS,
    getAllCharAssets,
} = _testExports;

// 构造最小 MatchState
function makeState(
    hostStarted: boolean,
    chars: Record<string, string> = { '0': 'unselected', '1': 'unselected' },
): unknown {
    return {
        core: {
            selectedCharacters: chars,
            hostStarted,
        } as Partial<DiceThroneCore>,
    } as MatchState<DiceThroneCore>;
}

describe('diceThroneCriticalImageResolver', () => {
    it('无状态时返回选角界面资源为 critical', () => {
        const result = diceThroneCriticalImageResolver(undefined);
        expect(result.phaseKey).toBe('no-state');
        // 通用资源在 critical 中
        for (const p of COMMON_CRITICAL_PATHS) {
            expect(result.critical).toContain(p);
        }
        // player-board 在 critical 中（selection 标签）
        for (const c of IMPLEMENTED_CHARACTERS) {
            expect(result.critical).toContain(`dicethrone/images/${c}/player-board`);
        }
    });

    it('选角阶段：selection 标签资源为 critical，gameplay 独有资源为 warm', () => {
        const result = diceThroneCriticalImageResolver(makeState(false));
        expect(result.phaseKey).toBe('setup');
        // dice 应在 warm 中（gameplay 标签，不在 selection 中）
        for (const c of IMPLEMENTED_CHARACTERS) {
            expect(result.warm).toContain(`dicethrone/images/${c}/dice`);
            expect(result.warm).toContain(`dicethrone/images/${c}/ability-cards`);
            expect(result.warm).toContain(`dicethrone/images/${c}/status-icons-atlas`);
        }
    });

    it('游戏进行中：已选角色的全部资源类型都在 critical 中', () => {
        const result = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'monk', '1': 'barbarian' }),
        );
        expect(result.phaseKey).toContain('playing');

        // 核心断言：每个已选角色的每种资源类型都必须在 critical 中
        for (const charId of ['monk', 'barbarian'] as const) {
            const allAssets = getAllCharAssets(charId);
            for (const asset of allAssets) {
                expect(result.critical, `缺少 ${asset}`).toContain(asset);
            }
        }
    });

    it('游戏进行中：骰子图集在 critical 中（曾经遗漏的 bug）', () => {
        const result = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'pyromancer', '1': 'shadow_thief' }),
        );
        expect(result.critical).toContain('dicethrone/images/pyromancer/dice');
        expect(result.critical).toContain('dicethrone/images/shadow_thief/dice');
    });

    it('未选角色的资源在 warm 中', () => {
        const result = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'monk', '1': 'barbarian' }),
        );
        // pyromancer 未选，应在 warm 中
        expect(result.warm).toContain('dicethrone/images/pyromancer/ability-cards');
        expect(result.warm).toContain('dicethrone/images/pyromancer/dice');
    });

    it('critical 和 warm 无重叠', () => {
        const result = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'monk', '1': 'paladin' }),
        );
        const criticalSet = new Set(result.critical);
        for (const w of result.warm) {
            expect(criticalSet.has(w), `${w} 同时出现在 critical 和 warm 中`).toBe(false);
        }
    });

    it('CHARACTER_ASSET_TYPES 覆盖所有已知资源类型', () => {
        // 防护性测试：确保资源类型列表包含已知的关键资源
        const keys = CHARACTER_ASSET_TYPES.map(a => a.key);
        expect(keys).toContain('player-board');
        expect(keys).toContain('tip');
        expect(keys).toContain('ability-cards');
        expect(keys).toContain('dice');
        expect(keys).toContain('status-icons-atlas');
    });

    it('phaseKey 随选角变化', () => {
        const r1 = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'monk', '1': 'unselected' }),
        );
        const r2 = diceThroneCriticalImageResolver(
            makeState(true, { '0': 'monk', '1': 'barbarian' }),
        );
        expect(r1.phaseKey).not.toBe(r2.phaseKey);
    });
});
