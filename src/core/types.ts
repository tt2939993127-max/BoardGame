/**
 * 框架核心类型定义
 * 
 * 定义与 Boardgame.io 集成的核心接口，与具体游戏逻辑无关。
 * 禁止使用 `any` 类型。
 */

import type { Game } from 'boardgame.io';
import type { BoardProps } from 'boardgame.io/react';
import type { TutorialManifest } from '../contexts/TutorialContext';

// ============================================================================
// 游戏实现注册类型
// ============================================================================

/**
 * 游戏实现配置
 * 用于在 registry 中注册一个完整的游戏
 * 
 * 设计说明：
 * - 由于 Boardgame.io 的 Game<G> 和 BoardProps<G> 存在泛型逆变问题，
 *   在异构映射表中无法使用精确泛型约束
 * - 此处使用 Game 和 BoardProps 的基础形式作为框架边界类型
 * - 具体类型安全由各游戏模块内部 (game.ts / Board.tsx) 保证
 * - 运行时类型由 Boardgame.io 框架保证一致性
 */
export interface GameImplementation {
    /** Boardgame.io 游戏定义 */
    game: Game;
    /** React 棋盘组件（接收 BoardProps） */
    board: React.ComponentType<BoardProps>;
    /** 可选的教程配置 */
    tutorial?: TutorialManifest;
}

// ============================================================================
// 资源管理类型
// ============================================================================

/**
 * 精灵图集定义
 */
export interface SpriteAtlasDefinition {
    id: string;
    /** 图集图片路径（相对于 /assets/） */
    imagePath: string;
    /** 帧定义 */
    frames: SpriteFrame[];
}

/**
 * 精灵帧定义
 */
export interface SpriteFrame {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * 游戏资源清单
 */
export interface GameAssets {
    /** 图片资源映射 { key: 相对路径 } */
    images?: Record<string, string>;
    /** 音频资源映射 { key: 相对路径 } */
    audio?: Record<string, string>;
    /** 精灵图集 */
    sprites?: SpriteAtlasDefinition[];
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 确保类型不是 any
 * 用于编译时检查，防止意外使用 any
 */
export type NoAny<T> = T extends never ? never : unknown extends T ? never : T;
