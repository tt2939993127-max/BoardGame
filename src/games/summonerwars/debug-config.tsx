/**
 * 召唤师战争 调试工具配置
 * 定义游戏专属的作弊指令 UI
 */

import React, { useState, useMemo } from 'react';
import type { SummonerWarsCore, GamePhase } from './domain/types';
import { PHASE_ORDER } from './domain/types';
import { SPRITE_INDEX } from './config/factions/necromancer';
import { resolveCardDisplayName } from '../../components/game/framework/debug/cardNameResolver';

interface SummonerWarsDebugConfigProps {
    G: { core: SummonerWarsCore };
    dispatch: (type: string, payload?: unknown) => void;
}

/** 阶段中文名映射 */
const PHASE_LABELS: Record<GamePhase, string> = {
    factionSelect: '选阵营',
    summon: '召唤',
    move: '移动',
    build: '建造',
    attack: '攻击',
    magic: '魔力',
    draw: '抽牌',
};

/** 精灵图索引到卡牌名称的映射 */
const ATLAS_INDEX_TO_CARD: { index: number; name: string; type: 'unit' | 'event' | 'structure'; atlas: 'cards' | 'hero' }[] = [
    { index: SPRITE_INDEX.CHAMPION_ELUT_BAR, name: '伊路特-巴尔', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.EVENT_FUNERAL_PYRE, name: '殉葬火堆', type: 'event', atlas: 'cards' },
    { index: SPRITE_INDEX.CHAMPION_DRAGOS, name: '德拉戈斯', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.EVENT_HELLFIRE_BLADE, name: '狱火铸剑', type: 'event', atlas: 'cards' },
    { index: SPRITE_INDEX.EVENT_ANNIHILATE, name: '除灭', type: 'event', atlas: 'cards' },
    { index: SPRITE_INDEX.EVENT_BLOOD_SUMMON, name: '血契召唤', type: 'event', atlas: 'cards' },
    { index: SPRITE_INDEX.COMMON_UNDEAD_WARRIOR, name: '亡灵战士', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.COMMON_HELLFIRE_CULTIST, name: '地狱火教徒', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.COMMON_PLAGUE_ZOMBIE, name: '亡灵疫病体', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.COMMON_UNDEAD_ARCHER, name: '亡灵弓箭手', type: 'unit', atlas: 'cards' },
    { index: SPRITE_INDEX.CHAMPION_GUL_DAS, name: '古尔-达斯', type: 'unit', atlas: 'cards' },
];

export const SummonerWarsDebugConfig: React.FC<SummonerWarsDebugConfigProps> = ({ G, dispatch }) => {
    const core = G?.core;

    const [cheatPlayer, setCheatPlayer] = useState<string>('0');
    const [cheatValue, setCheatValue] = useState<string>('5');
    const [targetPhase, setTargetPhase] = useState<GamePhase>('summon');
    const [dealPlayer, setDealPlayer] = useState<string>('0');
    const [atlasIndex, setAtlasIndex] = useState<string>('0');

    const playerDeck = useMemo(() => core?.players?.[dealPlayer as '0' | '1']?.deck ?? [], [core, dealPlayer]);
    const playerHand = useMemo(() => core?.players?.[dealPlayer as '0' | '1']?.hand ?? [], [core, dealPlayer]);

    const cardInDeck = useMemo(() => {
        const targetIndex = Number(atlasIndex);
        return playerDeck.find(c => c.spriteIndex === targetIndex);
    }, [playerDeck, atlasIndex]);

    return (
        <div className="space-y-4">
            {/* 魔力作弊 */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">魔力修改</h4>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <select value={cheatPlayer} onChange={(e) => setCheatPlayer(e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-purple-300 rounded bg-white text-gray-900">
                            <option value="0">P0 ({core?.players?.['0']?.magic ?? 0} 魔力)</option>
                            <option value="1">P1 ({core?.players?.['1']?.magic ?? 0} 魔力)</option>
                        </select>
                        <input type="number" min="0" max="15" value={cheatValue} onChange={(e) => setCheatValue(e.target.value)} className="w-16 px-2 py-1.5 text-xs border border-purple-300 rounded bg-white text-center text-gray-900" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => dispatch('SYS_CHEAT_SET_RESOURCE', { playerId: cheatPlayer, resourceId: 'magic', value: Number(cheatValue) })} className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded text-xs font-bold hover:bg-purple-600">设置为</button>
                        <button onClick={() => dispatch('SYS_CHEAT_ADD_RESOURCE', { playerId: cheatPlayer, resourceId: 'magic', delta: Number(cheatValue) })} className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600">+增加</button>
                        <button onClick={() => dispatch('SYS_CHEAT_ADD_RESOURCE', { playerId: cheatPlayer, resourceId: 'magic', delta: -Number(cheatValue) })} className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600">-减少</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => dispatch('SYS_CHEAT_SET_RESOURCE', { playerId: cheatPlayer, resourceId: 'magic', value: 0 })} className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-300">清零</button>
                        <button onClick={() => dispatch('SYS_CHEAT_SET_RESOURCE', { playerId: cheatPlayer, resourceId: 'magic', value: 15 })} className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-300">满魔力 (15)</button>
                    </div>
                </div>
            </div>

            {/* 阶段作弊 */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">阶段切换</h4>
                <div className="space-y-2">
                    <div className="text-[9px] text-blue-600 mb-1">当前阶段: <span className="font-bold">{PHASE_LABELS[core?.phase ?? 'summon']}</span></div>
                    <div className="flex gap-2">
                        <select value={targetPhase} onChange={(e) => setTargetPhase(e.target.value as GamePhase)} className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded bg-white text-gray-900">
                            {PHASE_ORDER.map((phase) => (<option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>))}
                        </select>
                        <button onClick={() => dispatch('SYS_CHEAT_SET_PHASE', { phase: targetPhase })} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600">切换</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        {PHASE_ORDER.map((phase) => (
                            <button key={phase} onClick={() => dispatch('SYS_CHEAT_SET_PHASE', { phase })} className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${core?.phase === phase ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{PHASE_LABELS[phase]}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 发牌作弊 */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200" data-testid="sw-debug-deal">
                <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3">发牌调试 (精灵图索引)</h4>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <select value={dealPlayer} onChange={(e) => setDealPlayer(e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-green-300 rounded bg-white text-gray-900">
                            <option value="0">P0</option>
                            <option value="1">P1</option>
                        </select>
                        <input type="number" min="0" max={20} value={atlasIndex} onChange={(e) => setAtlasIndex(e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-green-300 rounded bg-white text-center text-gray-900" placeholder="精灵图索引" />
                    </div>
                    <div className="text-[9px] text-green-600 mb-1">
                        牌库剩余: {playerDeck.length} 张
                        {cardInDeck ? <span className="ml-1 text-green-700">| 牌库中存在: {resolveCardDisplayName(cardInDeck)}</span> : <span className="ml-1 text-red-400">| 牌库中不存在该索引</span>}
                    </div>
                    <button onClick={() => dispatch('SYS_CHEAT_DEAL_CARD_BY_ATLAS_INDEX', { playerId: dealPlayer, atlasIndex: Number(atlasIndex) })} disabled={!cardInDeck} className="w-full px-3 py-1.5 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed" data-testid="sw-debug-deal-apply">🎴 发指定牌 (Atlas)</button>
                </div>
            </div>

            {/* 卡牌索引速查表 */}
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">精灵图索引速查 (cards.png)</h4>
                <div className="max-h-40 overflow-y-auto">
                    <div className="space-y-1">
                        {ATLAS_INDEX_TO_CARD.map((item) => {
                            const inDeck = playerDeck.some(c => c.spriteIndex === item.index);
                            return (
                                <div key={item.index} className={`flex items-center gap-2 text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors ${inDeck ? 'text-amber-700 hover:bg-amber-100' : 'text-gray-400'}`} onClick={() => { if (inDeck) { setAtlasIndex(String(item.index)); dispatch('SYS_CHEAT_DEAL_CARD_BY_ATLAS_INDEX', { playerId: dealPlayer, atlasIndex: item.index }); } }}>
                                    <span className="w-5 text-amber-500 font-mono">{item.index}</span>
                                    <span className={`px-1 rounded text-[8px] ${item.type === 'unit' ? 'bg-amber-200 text-amber-800' : item.type === 'event' ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-800'}`}>{item.type === 'unit' ? '单位' : item.type === 'event' ? '事件' : '建筑'}</span>
                                    <span className="flex-1 truncate">{resolveCardDisplayName(playerDeck.find(c => c.spriteIndex === item.index))}</span>
                                    {inDeck ? <span className="text-green-500 text-[8px]">✓ 可发</span> : <span className="text-gray-300 text-[8px]">✗</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 手牌预览 */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">手牌预览 (P{dealPlayer})</h4>
                <div className="max-h-24 overflow-y-auto">
                    {playerHand.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-2">手牌为空</div>
                    ) : (
                        <div className="space-y-1">
                            {playerHand.map((card, idx) => (
                                <div key={`${card.id}-${idx}`} className="flex items-center gap-2 text-[10px] text-slate-700 px-1 py-0.5 rounded">
                                    <span className="w-5 text-slate-400 font-mono">{card.spriteIndex ?? '-'}</span>
                                    <span className={`px-1 rounded text-[8px] ${card.cardType === 'unit' ? 'bg-amber-200 text-amber-800' : card.cardType === 'event' ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-800'}`}>{card.cardType === 'unit' ? '单位' : card.cardType === 'event' ? '事件' : '建筑'}</span>
                                    <span className="flex-1 truncate">{resolveCardDisplayName(card)}</span>
                                    {'cost' in card && <span className="text-purple-500">💎{card.cost}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
