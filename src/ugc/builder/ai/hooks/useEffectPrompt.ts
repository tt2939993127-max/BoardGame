/**
 * 效果交互提示词 Hook
 * 
 * 生成完整的效果执行流程提示词，包括：
 * - 目标选择
 * - UI区域控制
 * - 状态变更
 * - moves调用
 */

import { useCallback } from 'react';
import { usePromptContext } from '../../context';
import { 
  TECH_STACK, 
  OUTPUT_RULES, 
  GAME_STATE_STRUCTURE, 
  CTX_STRUCTURE, 
  AVAILABLE_MOVES 
} from '../promptUtils';

interface EffectPromptOptions {
  effectDescription: string;
  effectType?: 'damage' | 'heal' | 'draw' | 'discard' | 'moveCard' | 'custom';
  targetType?: 'self' | 'opponent' | 'selected' | 'all';
}

/**
 * 效果交互提示词生成器
 * 
 * 职责：生成完整的效果执行代码提示词
 */
export function useEffectPrompt() {
  const ctx = usePromptContext();

  /** 生成效果执行提示词 */
  const generateEffect = useCallback((options: EffectPromptOptions) => {
    const schemas = ctx.schemasSummary?.join('\n- ') || '无';
    
    return `你是一个桌游效果代码生成专家。请根据效果描述生成完整的交互代码。

${TECH_STACK}

## 游戏: ${ctx.gameName || '未命名游戏'}
${ctx.gameDescription || ''}

## 可用数据结构 (Schema)
- ${schemas}

## 效果描述
${options.effectDescription}

## 效果类型: ${options.effectType || 'custom'}
## 目标类型: ${options.targetType || 'selected'}

${GAME_STATE_STRUCTURE}

${CTX_STRUCTURE}

${AVAILABLE_MOVES}

## 输出要求
请生成一个完整的效果执行函数，包含：
1. 目标选择逻辑（如果需要）
2. UI交互流程（显示特写区域等）
3. 状态变更（调用moves）
4. 错误处理

## 输出格式
\`\`\`typescript
// 效果: ${options.effectDescription}
function executeEffect(
  G: GameState,
  ctx: Ctx,
  moves: Moves,
  selectedTargetId?: string
): void {
  // 实现效果逻辑
}

// UI组件（如果需要选择目标）
function EffectUI({ G, ctx, moves }: Props) {
  // 渲染选择界面
}
\`\`\`

${OUTPUT_RULES}`;
  }, [ctx]);

  /** 生成"顺手牵羊"类效果的完整流程 */
  const generateStealCardEffect = useCallback(() => {
    return generateEffect({
      effectDescription: `顺手牵羊效果：
1. 选择一个对手玩家
2. 显示对方手牌在特写区域
3. 从对方手牌中选择一张牌
4. 将选中的牌转移到自己手牌
5. 关闭特写区域`,
      effectType: 'moveCard',
      targetType: 'opponent',
    });
  }, [generateEffect]);

  return { generateEffect, generateStealCardEffect };
}
