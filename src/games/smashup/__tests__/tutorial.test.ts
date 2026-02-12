/**
 * 大杀四方教学 manifest 结构验证
 *
 * 验证教学配置的完整性和正确性：
 * - 步骤 id 唯一性
 * - content 字段格式
 * - setup 步骤包含 aiActions
 * - randomPolicy 已设置
 */

import { describe, it, expect } from 'vitest';
import SMASH_UP_TUTORIAL from '../tutorial';

describe('SmashUp Tutorial Manifest 结构验证', () => {
    it('manifest id 已设置', () => {
        expect(SMASH_UP_TUTORIAL.id).toBe('smashup-basic');
    });

    it('randomPolicy 已设置为 fixed 模式', () => {
        expect(SMASH_UP_TUTORIAL.randomPolicy).toEqual({ mode: 'fixed', values: [1] });
    });

    it('所有步骤 id 唯一', () => {
        const ids = SMASH_UP_TUTORIAL.steps.map(s => s.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('所有 content 字段匹配 game-smashup:tutorial.* 模式', () => {
        for (const step of SMASH_UP_TUTORIAL.steps) {
            expect(step.content).toMatch(/^game-smashup:tutorial\./);
        }
    });

    it('setup 步骤包含 aiActions', () => {
        const setup = SMASH_UP_TUTORIAL.steps.find(s => s.id === 'setup');
        expect(setup).toBeDefined();
        expect(setup!.aiActions).toBeDefined();
        expect(setup!.aiActions!.length).toBeGreaterThan(0);
    });

    it('至少包含 15 个教学步骤', () => {
        expect(SMASH_UP_TUTORIAL.steps.length).toBeGreaterThanOrEqual(15);
    });

    it('finish 步骤存在且为最后一步', () => {
        const last = SMASH_UP_TUTORIAL.steps[SMASH_UP_TUTORIAL.steps.length - 1];
        expect(last.id).toBe('finish');
    });

    it('交互步骤配置了 allowedTargets 目标级门控', () => {
        const playMinion = SMASH_UP_TUTORIAL.steps.find(s => s.id === 'playMinion');
        expect(playMinion?.allowedTargets).toEqual(['tut-1']);

        const playAction = SMASH_UP_TUTORIAL.steps.find(s => s.id === 'playAction');
        expect(playAction?.allowedTargets).toEqual(['tut-2']);

        const useTalent = SMASH_UP_TUTORIAL.steps.find(s => s.id === 'useTalent');
        expect(useTalent?.allowedTargets).toEqual(['tut-1']);
    });

    it('allowedTargets 只引用教学手牌中存在的 uid', () => {
        const tutorialHand = SMASH_UP_TUTORIAL.steps.find(s => s.id === 'setup');
        const mergeAction = tutorialHand?.aiActions?.find(
            a => a.commandType === 'SYS_CHEAT_MERGE_STATE'
        );
        const handCards = (mergeAction?.payload as any)?.fields?.players?.['0']?.hand ?? [];
        const handUids = new Set(handCards.map((c: any) => c.uid));

        for (const step of SMASH_UP_TUTORIAL.steps) {
            if (!step.allowedTargets) continue;
            for (const target of step.allowedTargets) {
                expect(handUids.has(target), `allowedTarget '${target}' 在步骤 '${step.id}' 中引用了不存在的手牌 uid`).toBe(true);
            }
        }
    });
});
