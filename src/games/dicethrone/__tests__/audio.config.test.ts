/**
 * DiceThrone 音效配置单元测试
 * 验证 CP 音效和 Monk 技能音效配置的正确性
 */
import { describe, it, expect } from 'vitest';
import { DICETHRONE_AUDIO_CONFIG } from '../audio.config';
import { STATUS_IDS, TOKEN_IDS } from '../domain/ids';
import { ALL_TOKEN_DEFINITIONS } from '../domain/characters';
import { MONK_ABILITIES } from '../heroes/monk/abilities';
import type { AudioEvent } from '../../../lib/audio/types';

const CP_GAIN_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_mana_surge_001';
const CP_SPEND_KEY = 'status.general.player_status_sound_fx_pack.fantasy.fantasy_dispel_001';

const ABILITY_SFX_KEYS = {
    transcendence: 'combat.general.fight_fury_vol_2.special_hit.fghtimpt_special_hit_02_krst',
    thunderStrike: 'combat.general.fight_fury_vol_2.versatile_punch_hit.fghtimpt_versatile_punch_hit_01_krst',
    taijiCombo: 'combat.general.mini_games_sound_effects_and_music_pack.kick_punch.sfx_fight_kick_swoosh_1',
} as const;

describe('DiceThrone 音效配置', () => {
    describe('CP 音效配置', () => {
        it('eventSoundResolver 应根据 delta 正负值返回正确的 CP 音效键', () => {
            const resolver = DICETHRONE_AUDIO_CONFIG.eventSoundResolver;
            if (!resolver) {
                throw new Error('eventSoundResolver 未定义');
            }

            // 测试 CP 增加
            const gainEvent: AudioEvent = { type: 'CP_CHANGED', payload: { delta: 2 } };
            const gainResult = resolver(gainEvent, { G: {}, ctx: {}, meta: {} } as any);
            expect(gainResult).toBe(CP_GAIN_KEY);

            // 测试 CP 减少
            const spendEvent: AudioEvent = { type: 'CP_CHANGED', payload: { delta: -3 } };
            const spendResult = resolver(spendEvent, { G: {}, ctx: {}, meta: {} } as any);
            expect(spendResult).toBe(CP_SPEND_KEY);

            // 测试 delta 为 0（边界情况）
            const zeroEvent: AudioEvent = { type: 'CP_CHANGED', payload: { delta: 0 } };
            const zeroResult = resolver(zeroEvent, { G: {}, ctx: {}, meta: {} } as any);
            expect(zeroResult).toBe(CP_GAIN_KEY); // delta >= 0 返回 cp_gain
        });
    });

    describe('Monk 技能音效配置', () => {
        it('超凡入圣技能应配置正确的 sfxKey', () => {
            const transcendence = MONK_ABILITIES.find(a => a.id === 'transcendence');
            expect(transcendence).toBeDefined();
            expect(transcendence?.sfxKey).toBe(ABILITY_SFX_KEYS.transcendence);
        });

        it('雷霆一击技能应配置正确的 sfxKey', () => {
            const thunderStrike = MONK_ABILITIES.find(a => a.id === 'thunder-strike');
            expect(thunderStrike).toBeDefined();
            expect(thunderStrike?.sfxKey).toBe(ABILITY_SFX_KEYS.thunderStrike);
        });

        it('太极连击技能应配置正确的 sfxKey', () => {
            const taijiCombo = MONK_ABILITIES.find(a => a.id === 'taiji-combo');
            expect(taijiCombo).toBeDefined();
            expect(taijiCombo?.sfxKey).toBe(ABILITY_SFX_KEYS.taijiCombo);
        });

        it('防御技能不播放音效', () => {
            const resolver = DICETHRONE_AUDIO_CONFIG.eventSoundResolver;
            if (!resolver) {
                throw new Error('eventSoundResolver 未定义');
            }

            // 测试防御技能（不播放音效）
            const meditation = MONK_ABILITIES.find(a => a.id === 'meditation');
            expect(meditation).toBeDefined();
            expect(meditation?.sfxKey).toBeUndefined();

            // 模拟技能激活事件
            const event: AudioEvent = {
                type: 'ABILITY_ACTIVATED',
                payload: { playerId: 'player1', abilityId: 'meditation', isDefense: true },
            };

            // 创建模拟的游戏状态
            const mockContext = {
                G: {
                    players: {
                        player1: {
                            heroId: 'monk',
                            abilities: MONK_ABILITIES,
                        },
                    },
                },
                ctx: {},
                meta: {},
            } as any;

            const result = resolver(event, mockContext);
            expect(result).toBeNull();
        });
    });

    describe('BGM 配置', () => {
        it('应有 16 首 BGM（4 normal + 12 battle）', () => {
            expect(DICETHRONE_AUDIO_CONFIG.bgm).toHaveLength(16);
        });

        it('BGM 不应与 SW 撞曲（禁止 Corsair / Lonely Bard / Luminesce / Wind Chime / Elder Awakening / Feysong Fields）', () => {
            const keys = DICETHRONE_AUDIO_CONFIG.bgm!.map(b => b.key);
            expect(keys).not.toContain('bgm.fantasy.fantasy_music_pack_vol.corsair_rt_3.fantasy_vol5_corsair_main');
            expect(keys).not.toContain('bgm.fantasy.fantasy_music_pack_vol.lonely_bard_rt_3.fantasy_vol5_lonely_bard_main');
            expect(keys).not.toContain('bgm.ethereal.ethereal_music_pack.luminesce_rt_4.ethereal_luminesce_main');
            expect(keys).not.toContain('bgm.ethereal.ethereal_music_pack.wind_chime_rt_5.ethereal_wind_chime_main');
            expect(keys).not.toContain('bgm.fantasy.fantasy_music_pack_vol.elder_awakening_rt_2.fantasy_vol7_elder_awakening_main');
            expect(keys).not.toContain('bgm.fantasy.fantasy_music_pack_vol.feysong_fields_rt_3.fantasy_vol7_feysong_fields_main');
        });

        it('应有 bgmGroups（normal + battle）', () => {
            expect(DICETHRONE_AUDIO_CONFIG.bgmGroups).toBeDefined();
            expect(DICETHRONE_AUDIO_CONFIG.bgmGroups!.normal).toBeDefined();
            expect(DICETHRONE_AUDIO_CONFIG.bgmGroups!.battle).toBeDefined();
            expect(DICETHRONE_AUDIO_CONFIG.bgmGroups!.normal.length).toBeGreaterThanOrEqual(3);
            expect(DICETHRONE_AUDIO_CONFIG.bgmGroups!.battle.length).toBeGreaterThanOrEqual(3);
        });

        it('bgmRules 应按阶段切换 group', () => {
            const rules = DICETHRONE_AUDIO_CONFIG.bgmRules ?? [];
            const battleRule = rules.find(r => r.when({ G: {}, ctx: { currentPhase: 'offensiveRoll' }, meta: {} } as any));
            const normalRule = rules.find(r => r.when({ G: {}, ctx: { currentPhase: 'upkeep' }, meta: {} } as any));
            expect(battleRule?.group).toBe('battle');
            expect(normalRule?.group).toBe('normal');
        });

        it('所有 BGM key 必须存在于 registry', () => {
            const registryRaw = require('fs').readFileSync(
                require('path').join(process.cwd(), 'public', 'assets', 'common', 'audio', 'registry.json'),
                'utf-8'
            );
            const registry = JSON.parse(registryRaw) as { entries: Array<{ key: string }> };
            const registryMap = new Map(registry.entries.map(e => [e.key, e]));
            for (const bgm of DICETHRONE_AUDIO_CONFIG.bgm!) {
                expect(registryMap.has(bgm.key), `BGM key 不在 registry: ${bgm.key}`).toBe(true);
            }
        });
    });

    describe('状态/Token 音效映射', () => {
        it('状态施加应按 statusId 使用专属音效', () => {
            const resolver = DICETHRONE_AUDIO_CONFIG.eventSoundResolver;
            if (!resolver) {
                throw new Error('eventSoundResolver 未定义');
            }

            const statusDef = ALL_TOKEN_DEFINITIONS.find(def => def.id === STATUS_IDS.BURN);
            expect(statusDef).toBeDefined();
            const event: AudioEvent = {
                type: 'STATUS_APPLIED',
                payload: { statusId: STATUS_IDS.BURN },
            };
            const result = resolver(event, { G: { tokenDefinitions: ALL_TOKEN_DEFINITIONS }, ctx: {}, meta: {} } as any);
            expect(result).toBe(statusDef?.sfxKey);
        });

        it('Token 授予应按 tokenId 使用专属音效', () => {
            const resolver = DICETHRONE_AUDIO_CONFIG.eventSoundResolver;
            if (!resolver) {
                throw new Error('eventSoundResolver 未定义');
            }

            const tokenDef = ALL_TOKEN_DEFINITIONS.find(def => def.id === TOKEN_IDS.TAIJI);
            expect(tokenDef).toBeDefined();
            const event: AudioEvent = {
                type: 'TOKEN_GRANTED',
                payload: { tokenId: TOKEN_IDS.TAIJI },
            };
            const result = resolver(event, { G: { tokenDefinitions: ALL_TOKEN_DEFINITIONS }, ctx: {}, meta: {} } as any);
            expect(result).toBe(tokenDef?.sfxKey);
        });
    });
});
