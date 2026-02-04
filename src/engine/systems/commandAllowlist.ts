/**
 * 命令白名单辅助（Undo / ActionLog 共享）
 */

export type CommandAllowlist = ReadonlyArray<string> | ReadonlySet<string>;
export type NormalizedCommandAllowlist = ReadonlySet<string> | null;

const BLOCKED_PREFIXES = ['SYS_', 'CHEAT_', 'UI_', 'DEV_'] as const;

/**
 * 标准化 allowlist
 */
export function normalizeCommandAllowlist(
    allowlist?: CommandAllowlist
): NormalizedCommandAllowlist {
    if (!allowlist) return null;
    return allowlist instanceof Set ? allowlist : new Set(allowlist);
}

/**
 * 判断命令是否允许进入撤回/操作日志
 */
export function isCommandAllowlisted(
    commandType: string,
    allowlist: NormalizedCommandAllowlist,
    options: { fallbackToAllowAll?: boolean } = {}
): boolean {
    if (BLOCKED_PREFIXES.some(prefix => commandType.startsWith(prefix))) {
        return false;
    }

    if (!allowlist) {
        return options.fallbackToAllowAll ?? false;
    }

    return allowlist.has(commandType);
}
