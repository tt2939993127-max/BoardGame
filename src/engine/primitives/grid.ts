/**
 * engine/primitives/grid — 通用二维网格工具函数
 *
 * 适用于所有基于二维网格的桌游（战棋、象棋、围棋、塔防等）。
 * 纯函数，无副作用，不依赖任何游戏特定类型。
 */

// ============================================================================
// 类型
// ============================================================================

/** 通用网格坐标 */
export interface GridPosition {
  row: number;
  col: number;
}

/** 网格搜索结果 */
export interface GridSearchResult<T> {
  cell: T;
  position: GridPosition;
}

// ============================================================================
// 坐标工具
// ============================================================================

/** 检查坐标是否在网格边界内 */
export function isValidGridCoord(pos: GridPosition, rows: number, cols: number): boolean {
  return pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols;
}

/** 曼哈顿距离 */
export function manhattanDist(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** 4 方向相邻检查（不含对角线） */
export function isGridAdjacent(a: GridPosition, b: GridPosition): boolean {
  return manhattanDist(a, b) === 1;
}

/** 获取有效的 4 方向相邻坐标列表 */
export function getAdjacentPositions(pos: GridPosition, rows: number, cols: number): GridPosition[] {
  const dirs: GridPosition[] = [
    { row: -1, col: 0 }, { row: 1, col: 0 },
    { row: 0, col: -1 }, { row: 0, col: 1 },
  ];
  return dirs
    .map(d => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter(p => isValidGridCoord(p, rows, cols));
}

// ============================================================================
// 网格搜索
// ============================================================================

/**
 * 在二维网格上查找第一个满足条件的单元格
 *
 * @example
 * // 查找 cardId 为 'hero-1' 的单位
 * const result = findOnGrid(core.board, (cell, pos) => cell?.unit?.cardId === 'hero-1');
 * if (result) { console.log(result.cell, result.position); }
 */
export function findOnGrid<T>(
  grid: T[][],
  predicate: (cell: T, position: GridPosition) => boolean,
): GridSearchResult<T> | undefined {
  for (let row = 0; row < grid.length; row++) {
    const rowArr = grid[row];
    if (!rowArr) continue;
    for (let col = 0; col < rowArr.length; col++) {
      const cell = rowArr[col];
      if (cell !== undefined && cell !== null && predicate(cell, { row, col })) {
        return { cell, position: { row, col } };
      }
    }
  }
  return undefined;
}

/**
 * 收集二维网格上所有满足条件的单元格
 *
 * @example
 * // 收集所有属于玩家 '0' 的单位
 * const units = collectOnGrid(core.board, (cell) => cell?.unit?.owner === '0');
 */
export function collectOnGrid<T>(
  grid: T[][],
  predicate: (cell: T, position: GridPosition) => boolean,
): GridSearchResult<T>[] {
  const results: GridSearchResult<T>[] = [];
  for (let row = 0; row < grid.length; row++) {
    const rowArr = grid[row];
    if (!rowArr) continue;
    for (let col = 0; col < rowArr.length; col++) {
      const cell = rowArr[col];
      if (cell !== undefined && cell !== null && predicate(cell, { row, col })) {
        results.push({ cell, position: { row, col } });
      }
    }
  }
  return results;
}

/**
 * 遍历指定位置的 4 方向相邻单元格（自动跳过越界）
 *
 * @example
 * forEachAdjacent(core.board, { row: 3, col: 4 }, (cell, pos) => {
 *   if (cell?.unit?.owner === '1') damageTargets.push(pos);
 * });
 */
export function forEachAdjacent<T>(
  grid: T[][],
  pos: GridPosition,
  callback: (cell: T, position: GridPosition) => void,
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const positions = getAdjacentPositions(pos, rows, cols);
  for (const adjPos of positions) {
    const cell = grid[adjPos.row]?.[adjPos.col];
    if (cell !== undefined && cell !== null) {
      callback(cell, adjPos);
    }
  }
}
