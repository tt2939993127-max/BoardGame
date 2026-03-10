/**
 * afterScoring 卡牌注册验证测试
 * 
 * 验证用户反馈的三张卡牌是否已正确注册：
 * 1. giant_ant_under_pressure（承受压力）- beforeScoring
 * 2. innsmouth_return_to_the_sea（重返深海）- afterScoring
 * 3. giant_ant_we_are_the_champions（我们乃最强）- afterScoring
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolveSpecial } from '../domain/abilityRegistry';
import { initAllAbilities } from '../abilities';

describe('afterScoring 卡牌注册验证', () => {
    beforeAll(() => {
        // 初始化所有能力注册
        initAllAbilities();
    });

    it('giant_ant_under_pressure 应该已注册为 special 能力', () => {
        const executor = resolveSpecial('giant_ant_under_pressure');
        expect(executor).toBeDefined();
        expect(typeof executor).toBe('function');
    });

    it('innsmouth_return_to_the_sea 应该已注册为 special 能力', () => {
        const executor = resolveSpecial('innsmouth_return_to_the_sea');
        expect(executor).toBeDefined();
        expect(typeof executor).toBe('function');
    });

    it('giant_ant_we_are_the_champions 应该已注册为 special 能力', () => {
        const executor = resolveSpecial('giant_ant_we_are_the_champions');
        expect(executor).toBeDefined();
        expect(typeof executor).toBe('function');
    });
});
