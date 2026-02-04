import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../useGameAudio', () => ({
    playSound: vi.fn(),
}));

import { playSound } from '../useGameAudio';
import { pickRandomSoundKey, playRandomSound } from '../audioUtils';

const originalRandom = Math.random;

afterEach(() => {
    (Math.random as unknown as typeof Math.random) = originalRandom;
    vi.clearAllMocks();
});

describe('audioUtils', () => {
    it('最小间隔避免连续重复', () => {
        (Math.random as unknown as typeof Math.random) = vi.fn(() => 0);
        const keys = ['a', 'b'];
        const first = pickRandomSoundKey('gap', keys, { minGap: 1 });
        const second = pickRandomSoundKey('gap', keys, { minGap: 1 });
        expect(first).toBe('a');
        expect(second).toBe('b');
    });

    it('支持权重随机', () => {
        (Math.random as unknown as typeof Math.random) = vi.fn(() => 0.1);
        const keys = ['a', 'b'];
        const picked = pickRandomSoundKey('weight', keys, { weights: [0, 1] });
        expect(picked).toBe('b');
    });

    it('playRandomSound 会触发播放', () => {
        (Math.random as unknown as typeof Math.random) = vi.fn(() => 0);
        const keys = ['a', 'b'];
        const picked = playRandomSound('play', keys);
        expect(playSound).toHaveBeenCalledWith(picked);
    });
});
