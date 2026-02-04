/**
 * AI 提示词生成器
 * 
 * 根据用户定义的 Schema、数据实例和 UI 布局，生成游戏规则代码的提示词
 */

import type { SchemaDefinition } from '../schema/types';
import type { SceneComponent } from '../ui/SceneCanvas';

// ============================================================================
// 类型定义
// ============================================================================

export interface GameContext {
  /** 游戏名称 */
  name: string;
  /** 游戏描述 */
  description: string;
  /** Schema 定义列表 */
  schemas: SchemaDefinition[];
  /** 数据实例（按 Schema ID 分组） */
  instances: Record<string, Record<string, unknown>[]>;
  /** UI 布局组件 */
  layout: SceneComponent[];
  /** 用户定义的 Tag */
  tags: string[];
}

// 分模块模板已移除，仅保留完整规则提示词

// ============================================================================
// 提示词生成器
// ============================================================================

export class PromptGenerator {
  private context: GameContext;

  constructor(context: GameContext) {
    this.context = context;
  }

  /** 生成完整的游戏规则提示词 */
  generateFullPrompt(requirement?: string): string {
    const requirementText = requirement?.trim() ? requirement.trim() : '未补充需求';
    return `你是一个桌游规则代码生成专家。请根据以下游戏定义，生成完整的 boardgame.io 游戏配置。

## 游戏信息
- 名称: ${this.context.name}
- 描述: ${this.context.description}
- 标签: ${this.context.tags.join(', ') || '无'}

## 用户需求
${requirementText}

## Schema 定义
${this.context.schemas.map(s => `
### ${s.name} (${s.id})
${s.description || ''}
字段:
${Object.entries(s.fields).map(([k, f]) => `- ${k}: ${f.type} (${f.label})${f.required ? ' [必填]' : ''}`).join('\n')}
`).join('\n')}

## 数据实例
${Object.entries(this.context.instances).map(([schemaId, items]) => `
### ${schemaId}
共 ${items.length} 条数据
${items.slice(0, 5).map(item => JSON.stringify(item, null, 2)).join('\n')}
${items.length > 5 ? `... 还有 ${items.length - 5} 条` : ''}
`).join('\n')}

## UI 布局
${this.context.layout.map(c => `- ${c.type}: ${String(c.data.name || c.type)} (${c.width}x${c.height} @ ${c.x},${c.y})`).join('\n') || '未配置'}

## 要求
1. 生成完整的 boardgame.io 游戏配置
2. 包含 setup、moves、phases、endIf
3. **效果执行必须使用现有 GAS 系统**（src/systems/core/Ability.ts & Effect.ts）
4. 禁止重新实现效果执行器，仅编排 GAS 能力数据与游戏规则调用
3. 使用 TypeScript，类型安全
4. 添加必要的注释
5. 代码可直接运行

请直接输出代码：`;
  }

}

// ============================================================================
// 工具函数
// ============================================================================

/** 创建空的游戏上下文 */
export function createEmptyContext(): GameContext {
  return {
    name: '新游戏',
    description: '',
    schemas: [],
    instances: {},
    layout: [],
    tags: [],
  };
}

