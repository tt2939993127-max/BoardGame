/**
 * useDiceThroneAudio Hook
 * 
 * 管理 DiceThrone 游戏的音效播放。
 * 监听游戏状态变化并自动触发相应音效。
 */

import { useEffect, useRef } from 'react';
import { AudioManager } from '../../../lib/audio/AudioManager';
import { playSound } from '../../../lib/audio/useGameAudio';
import { useAudio } from '../../../contexts/AudioContext';
import { DICETHRONE_AUDIO_CONFIG, AUDIO_KEYS } from '../audio.config';
import type { DiceThroneCore, TurnPhase } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import { RESOURCE_IDS } from '../domain/resources';

export interface DiceThroneAudioConfig {
    /** 核心游戏状态 */
    G: DiceThroneCore;
    /** 当前玩家 ID */
    currentPlayerId: PlayerId;
    /** 当前阶段 */
    currentPhase: TurnPhase;
    /** 游戏是否结束 */
    isGameOver: boolean;
    /** 当前玩家是否是赢家 */
    isWinner?: boolean;
}

/**
 * 初始化 DiceThrone 音频系统
 */
export function initDiceThroneAudio() {
    AudioManager.initialize();
    AudioManager.registerAll(DICETHRONE_AUDIO_CONFIG, DICETHRONE_AUDIO_CONFIG.basePath || '');
}

/**
 * DiceThrone 音频 Hook
 */
export function useDiceThroneAudio(config: DiceThroneAudioConfig) {
    const { G, currentPlayerId, currentPhase, isGameOver, isWinner } = config;
    const { setPlaylist, playBgm } = useAudio();
    const initializedRef = useRef(false);

    // 追踪上一次的状态
    const prevRollCountRef = useRef(G.rollCount);
    const prevRollConfirmedRef = useRef(G.rollConfirmed);
    const prevPhaseRef = useRef(currentPhase);
    const prevTurnRef = useRef(G.turnNumber);
    const prevHandLengthRef = useRef(G.players[currentPlayerId]?.hand.length ?? 0);
    const prevOpponentHpRef = useRef<number | undefined>(undefined);
    const prevPlayerHpRef = useRef<number | undefined>(undefined);
    const prevGameOverRef = useRef(isGameOver);

    // 初始化音频系统
    useEffect(() => {
        if (!initializedRef.current) {
            initDiceThroneAudio();

            // 设置 BGM 播放列表
            if (DICETHRONE_AUDIO_CONFIG.bgm && DICETHRONE_AUDIO_CONFIG.bgm.length > 0) {
                setPlaylist(DICETHRONE_AUDIO_CONFIG.bgm);
                playBgm(DICETHRONE_AUDIO_CONFIG.bgm[0].key);
            }

            initializedRef.current = true;
        }
    }, [setPlaylist, playBgm]);

    // 监听骰子投掷
    useEffect(() => {
        if (G.rollCount > prevRollCountRef.current) {
            // 随机选择一个骰子音效
            const diceKeys = [AUDIO_KEYS.DICE_ROLL, 'dice_roll_2', 'dice_roll_3'];
            const randomKey = diceKeys[Math.floor(Math.random() * diceKeys.length)];
            playSound(randomKey);
        }
        prevRollCountRef.current = G.rollCount;
    }, [G.rollCount]);

    // 监听骰子确认
    useEffect(() => {
        if (G.rollConfirmed && !prevRollConfirmedRef.current) {
            playSound(AUDIO_KEYS.DICE_CONFIRM);
        }
        prevRollConfirmedRef.current = G.rollConfirmed;
    }, [G.rollConfirmed]);

    // 监听阶段变化
    useEffect(() => {
        if (currentPhase !== prevPhaseRef.current) {
            playSound(AUDIO_KEYS.PHASE_CHANGE);
        }
        prevPhaseRef.current = currentPhase;
    }, [currentPhase]);

    // 监听回合变化
    useEffect(() => {
        if (G.turnNumber > prevTurnRef.current) {
            playSound(AUDIO_KEYS.TURN_CHANGE);
        }
        prevTurnRef.current = G.turnNumber;
    }, [G.turnNumber]);

    // 监听抽牌
    useEffect(() => {
        const player = G.players[currentPlayerId];
        if (!player) return;

        const currentHandLength = player.hand.length;
        if (currentHandLength > prevHandLengthRef.current) {
            playSound(AUDIO_KEYS.CARD_DRAW);
        }
        prevHandLengthRef.current = currentHandLength;
    }, [G.players, currentPlayerId]);

    // 监听对手受伤（攻击命中）
    useEffect(() => {
        const opponentId = Object.keys(G.players).find(id => id !== currentPlayerId);
        if (!opponentId) return;

        const opponentHp = G.players[opponentId]?.resources[RESOURCE_IDS.HP];
        if (prevOpponentHpRef.current !== undefined && opponentHp !== undefined) {
            if (opponentHp < prevOpponentHpRef.current) {
                // 根据伤害量选择音效
                const damage = prevOpponentHpRef.current - opponentHp;
                if (damage >= 8) {
                    playSound(AUDIO_KEYS.ATTACK_HIT_HEAVY);
                } else {
                    playSound(AUDIO_KEYS.ATTACK_HIT);
                }
            }
        }
        prevOpponentHpRef.current = opponentHp;
    }, [G.players, currentPlayerId]);

    // 监听自己受伤
    useEffect(() => {
        const playerHp = G.players[currentPlayerId]?.resources[RESOURCE_IDS.HP];
        if (prevPlayerHpRef.current !== undefined && playerHp !== undefined) {
            if (playerHp < prevPlayerHpRef.current) {
                playSound(AUDIO_KEYS.DAMAGE_DEALT);
            }
        }
        prevPlayerHpRef.current = playerHp;
    }, [G.players, currentPlayerId]);

    // 监听游戏结束
    useEffect(() => {
        if (isGameOver && !prevGameOverRef.current) {
            if (isWinner) {
                playSound(AUDIO_KEYS.VICTORY);
            } else {
                playSound(AUDIO_KEYS.DEFEAT);
            }
        }
        prevGameOverRef.current = isGameOver;
    }, [isGameOver, isWinner]);

    // 返回手动播放音效的函数
    return {
        playDiceRoll: () => playSound(AUDIO_KEYS.DICE_ROLL),
        playDiceLock: () => playSound(AUDIO_KEYS.DICE_LOCK),
        playCardPlay: () => playSound(AUDIO_KEYS.CARD_PLAY),
        playCardDiscard: () => playSound(AUDIO_KEYS.CARD_DISCARD),
        playCardSell: () => playSound(AUDIO_KEYS.CARD_SELL),
        playTokenGain: () => playSound(AUDIO_KEYS.TOKEN_GAIN),
        playTokenUse: () => playSound(AUDIO_KEYS.TOKEN_USE),
        playClick: () => playSound(AUDIO_KEYS.CLICK),
        playAttackPunch: () => playSound(AUDIO_KEYS.ATTACK_PUNCH),
    };
}
