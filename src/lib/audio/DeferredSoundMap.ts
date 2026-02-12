/**
 * DeferredSoundMap：框架→动画层的声音桥接
 *
 * 当 feedbackResolver 返回 timing: 'on-impact' 时，框架将 soundKey 写入此 map。
 * 动画层在冲击帧 / onComplete 时调用 consume() 取出并播放。
 *
 * - 以 EventStream entry ID 为 key，保证一对一
 * - consume() 读后即删，防止重复播放
 * - 超时自动清理（5s），防止无动画消费的事件泄漏
 */

import type { SoundKey } from './types';
import { playSound } from './useGameAudio';

const TIMEOUT_MS = 5_000;

interface DeferredEntry {
    key: SoundKey;
    timer: ReturnType<typeof setTimeout>;
}

class DeferredSoundMap {
    private map = new Map<number, DeferredEntry>();

    /** 框架写入：存储延迟播放的音效 */
    set(eventId: number, key: SoundKey): void {
        // 如果同一 eventId 已存在，先清理旧条目
        this.remove(eventId);
        const timer = setTimeout(() => this.map.delete(eventId), TIMEOUT_MS);
        this.map.set(eventId, { key, timer });
    }

    /** 动画层读取：取出音效 key 并删除条目 */
    consume(eventId: number): SoundKey | null {
        const entry = this.map.get(eventId);
        if (!entry) return null;
        clearTimeout(entry.timer);
        this.map.delete(eventId);
        return entry.key;
    }

    /** 清空所有条目（撤销/重置时调用） */
    clear(): void {
        for (const entry of this.map.values()) {
            clearTimeout(entry.timer);
        }
        this.map.clear();
    }

    private remove(eventId: number): void {
        const entry = this.map.get(eventId);
        if (entry) {
            clearTimeout(entry.timer);
            this.map.delete(eventId);
        }
    }
}

/** 全局单例 */
export const deferredSounds = new DeferredSoundMap();

/**
 * 便捷函数：从 DeferredSoundMap 取出音效并播放
 * 动画层在 onImpact / onComplete 时调用
 * @returns 返回播放的音效 key，如果没有找到则返回 null
 */
export function playDeferredSound(eventId: number): string | null {
    const key = deferredSounds.consume(eventId);
    if (key) {
        playSound(key);
        return key;
    }
    return null;
}
