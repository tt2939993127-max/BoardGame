/**
 * Samurai (武士) Token 定义
 * TODO: 等待清晰图片后补充完整的 Token 定义
 */

import type { TokenDef } from '../../domain/tokenTypes';
import { STATUS_IDS } from '../../domain/ids';

// TODO: 添加武士特有的 Token ID
export const SAMURAI_TOKEN_IDS = {
    // 待补充
} as const;

export const SAMURAI_TOKENS: TokenDef[] = [
    // 通用状态：击倒
    {
        id: STATUS_IDS.KNOCKDOWN,
        category: 'debuff',
        stackLimit: 1,
        onPhaseEnter: {
            phase: 'main1',
            effect: { type: 'skipPhase', phases: ['main1', 'main2'] },
        },
    },
    // TODO: 添加武士特有的 Token 定义
];

export const SAMURAI_INITIAL_TOKENS: Record<string, number> = {
    [STATUS_IDS.KNOCKDOWN]: 0,
    // TODO: 添加武士特有的初始 Token 值
};
