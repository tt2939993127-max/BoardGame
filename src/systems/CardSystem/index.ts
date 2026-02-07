/**
 * CardSystem - 通用卡牌系统
 *
 * 导出两套 API：
 * - operations: 纯函数工具（推荐，用于 domain reducer）
 * - cardSystem: 面向对象单例（保留兼容，zone-based 管理）
 */

export * from './types';
export * from './operations';
export { cardSystem } from './CardSystem';
