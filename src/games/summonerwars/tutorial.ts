/**
 * 召唤师战争 - 教学配置（亡灵法师 vs 亡灵法师）
 *
 * 完整覆盖6个阶段 + 召唤师技能（复活死灵）
 * 教学双方均使用堕落王国（Necromancer）阵营
 */

import type { TutorialManifest } from '../../engine/types';
import { SW_COMMANDS, SW_EVENTS } from './domain';

// 事件匹配器
const MATCH_PHASE_MOVE = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'move' } };
const MATCH_PHASE_BUILD = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'build' } };
const MATCH_PHASE_ATTACK = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'attack' } };
const MATCH_PHASE_MAGIC = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'magic' } };
const MATCH_PHASE_DRAW = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'draw' } };
const MATCH_PHASE_SUMMON = { type: SW_EVENTS.PHASE_CHANGED, match: { to: 'summon' } };

const SUMMONER_WARS_TUTORIAL: TutorialManifest = {
  id: 'summonerwars-basic',
  randomPolicy: { mode: 'fixed', values: [1] },
  steps: [
    // 0: 初始化 - 跳过阵营选择，双方自动选亡灵法师
    {
      id: 'setup',
      content: 'game-summonerwars:tutorial.steps.setup',
      position: 'center',
      requireAction: false,
      showMask: true,
      aiActions: [
        { commandType: SW_COMMANDS.SELECT_FACTION, payload: { factionId: 'necromancer' } },
        { commandType: SW_COMMANDS.PLAYER_READY, payload: {} },
        { commandType: SW_COMMANDS.HOST_START_GAME, payload: {} },
      ],
      advanceOnEvents: [
        { type: SW_EVENTS.GAME_INITIALIZED },
        MATCH_PHASE_SUMMON,
      ],
    },
    // 1: 欢迎
    {
      id: 'welcome',
      content: 'game-summonerwars:tutorial.steps.welcome',
      position: 'center',
      requireAction: false,
      showMask: true,
    },
    // 2: 棋盘概览
    {
      id: 'board-overview',
      content: 'game-summonerwars:tutorial.steps.boardOverview',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: false,
    },
    // 3: 召唤师介绍
    {
      id: 'summoner-intro',
      content: 'game-summonerwars:tutorial.steps.summonerIntro',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: false,
    },
    // 4: 魔力条介绍
    {
      id: 'magic-intro',
      content: 'game-summonerwars:tutorial.steps.magicIntro',
      highlightTarget: 'sw-player-bar',
      position: 'right',
      requireAction: false,
    },
    // 5: 阶段指示器介绍
    {
      id: 'phase-intro',
      content: 'game-summonerwars:tutorial.steps.phaseIntro',
      highlightTarget: 'sw-phase-tracker',
      position: 'left',
      requireAction: false,
    },
    // 6: 手牌介绍
    {
      id: 'hand-intro',
      content: 'game-summonerwars:tutorial.steps.handIntro',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: false,
    },
    // 7: 召唤阶段说明
    {
      id: 'summon-explain',
      content: 'game-summonerwars:tutorial.steps.summonExplain',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: false,
    },
    // 8: 召唤阶段 - 等待玩家召唤单位
    {
      id: 'summon-action',
      content: 'game-summonerwars:tutorial.steps.summonAction',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.SUMMON_UNIT],
      advanceOnEvents: [{ type: SW_EVENTS.UNIT_SUMMONED }],
    },
    // 9: 召唤师技能说明
    {
      id: 'ability-explain',
      content: 'game-summonerwars:tutorial.steps.abilityExplain',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: false,
      showMask: true,
    },
    // 10: 召唤师技能 - 等待玩家使用复活死灵
    {
      id: 'ability-action',
      content: 'game-summonerwars:tutorial.steps.abilityAction',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.ACTIVATE_ABILITY],
      advanceOnEvents: [
        { type: SW_EVENTS.ABILITY_TRIGGERED, match: { abilityId: 'revive_undead' } },
        { type: SW_EVENTS.UNIT_SUMMONED },
      ],
    },
    // 11: 结束召唤阶段
    {
      id: 'end-summon',
      content: 'game-summonerwars:tutorial.steps.endSummon',
      highlightTarget: 'sw-end-phase-btn',
      position: 'left',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.END_PHASE],
      advanceOnEvents: [MATCH_PHASE_MOVE],
    },
    // 12: 移动阶段说明
    {
      id: 'move-explain',
      content: 'game-summonerwars:tutorial.steps.moveExplain',
      highlightTarget: 'sw-phase-tracker',
      position: 'left',
      requireAction: false,
    },
    // 13: 移动阶段 - 等待玩家移动单位
    {
      id: 'move-action',
      content: 'game-summonerwars:tutorial.steps.moveAction',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.SELECT_UNIT, SW_COMMANDS.MOVE_UNIT],
      advanceOnEvents: [{ type: SW_EVENTS.UNIT_MOVED }],
    },
    // 14: 结束移动阶段
    {
      id: 'end-move',
      content: 'game-summonerwars:tutorial.steps.endMove',
      highlightTarget: 'sw-end-phase-btn',
      position: 'left',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.SELECT_UNIT, SW_COMMANDS.MOVE_UNIT, SW_COMMANDS.END_PHASE],
      advanceOnEvents: [MATCH_PHASE_BUILD],
    },
    // 15: 建造阶段说明
    {
      id: 'build-explain',
      content: 'game-summonerwars:tutorial.steps.buildExplain',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: false,
    },
    // 16: 建造阶段 - 等待玩家建造或跳过
    {
      id: 'build-action',
      content: 'game-summonerwars:tutorial.steps.buildAction',
      highlightTarget: 'sw-end-phase-btn',
      position: 'left',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.BUILD_STRUCTURE, SW_COMMANDS.END_PHASE],
      advanceOnEvents: [MATCH_PHASE_ATTACK],
    },
    // 17: 攻击阶段说明
    {
      id: 'attack-explain',
      content: 'game-summonerwars:tutorial.steps.attackExplain',
      highlightTarget: 'sw-phase-tracker',
      position: 'left',
      requireAction: false,
      showMask: true,
    },
    // 18: 攻击阶段 - 等待玩家宣告攻击
    {
      id: 'attack-action',
      content: 'game-summonerwars:tutorial.steps.attackAction',
      highlightTarget: 'sw-map-area',
      position: 'right',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.DECLARE_ATTACK, SW_COMMANDS.END_PHASE],
      advanceOnEvents: [{ type: SW_EVENTS.UNIT_ATTACKED }],
    },
    // 19: 攻击结果说明
    {
      id: 'attack-result',
      content: 'game-summonerwars:tutorial.steps.attackResult',
      position: 'center',
      requireAction: false,
      showMask: true,
    },
    // 20: 结束攻击阶段
    {
      id: 'end-attack',
      content: 'game-summonerwars:tutorial.steps.endAttack',
      highlightTarget: 'sw-end-phase-btn',
      position: 'left',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.DECLARE_ATTACK, SW_COMMANDS.END_PHASE],
      advanceOnEvents: [MATCH_PHASE_MAGIC],
    },
    // 21: 魔力阶段说明
    {
      id: 'magic-explain',
      content: 'game-summonerwars:tutorial.steps.magicExplain',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: false,
    },
    // 22: 魔力阶段 - 等待玩家弃牌或跳过
    {
      id: 'magic-action',
      content: 'game-summonerwars:tutorial.steps.magicAction',
      highlightTarget: 'sw-hand-area',
      position: 'top',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.DISCARD_FOR_MAGIC, SW_COMMANDS.END_PHASE],
      advanceOnEvents: [MATCH_PHASE_DRAW],
    },
    // 23: 抽牌阶段说明
    {
      id: 'draw-explain',
      content: 'game-summonerwars:tutorial.steps.drawExplain',
      highlightTarget: 'sw-deck-draw',
      position: 'right',
      requireAction: false,
    },
    // 24: 结束抽牌阶段
    {
      id: 'end-draw',
      content: 'game-summonerwars:tutorial.steps.endDraw',
      highlightTarget: 'sw-end-phase-btn',
      position: 'left',
      requireAction: true,
      allowedCommands: [SW_COMMANDS.END_PHASE],
      advanceOnEvents: [{ type: SW_EVENTS.TURN_CHANGED }],
    },
    // 25: 对手回合 - AI 自动执行
    {
      id: 'opponent-turn',
      content: 'game-summonerwars:tutorial.steps.opponentTurn',
      position: 'center',
      requireAction: false,
      showMask: true,
      aiActions: [
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
        { commandType: SW_COMMANDS.MOVE_UNIT, payload: { from: { row: 5, col: 3 }, to: { row: 4, col: 3 } } },
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
        { commandType: SW_COMMANDS.END_PHASE, payload: {} },
      ],
      advanceOnEvents: [
        { type: SW_EVENTS.TURN_CHANGED, match: { to: '0' } },
      ],
    },
    // 26: 不活动惩罚说明
    {
      id: 'inaction-penalty',
      content: 'game-summonerwars:tutorial.steps.inactionPenalty',
      position: 'center',
      requireAction: false,
      showMask: true,
    },
    // 27: 胜利条件
    {
      id: 'victory-condition',
      content: 'game-summonerwars:tutorial.steps.victoryCondition',
      position: 'center',
      requireAction: false,
      showMask: true,
    },
    // 28: 教学完成
    {
      id: 'finish',
      content: 'game-summonerwars:tutorial.steps.finish',
      position: 'center',
      requireAction: false,
      showMask: true,
    },
  ],
};

export default SUMMONER_WARS_TUTORIAL;
