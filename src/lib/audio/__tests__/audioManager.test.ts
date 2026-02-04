import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('howler', () => {
    const Howler = {
        mute: vi.fn(),
        volume: vi.fn(),
        stop: vi.fn(),
    };

    class Howl {
        options: Record<string, unknown>;
        constructor(options: Record<string, unknown>) {
            this.options = options;
        }
        play() {
            return 1;
        }
        stop() {}
        fade() {}
        volume() {}
        unload() {}
    }

    return { Howl, Howler };
});

import { AudioManager } from '../AudioManager';
import type { GameAudioConfig } from '../types';

describe('AudioManager', () => {
    beforeEach(() => {
        AudioManager.unloadAll();
    });

    it('onBgmChange 在播放/停止时触发，并支持取消订阅', () => {
        const config: GameAudioConfig = {
            bgm: [{ key: 'bgm-1', name: 'BGM 1', src: 'bgm-1.mp3' }],
        };

        AudioManager.registerAll(config);

        const listener = vi.fn();
        const unsubscribe = AudioManager.onBgmChange(listener);

        AudioManager.playBgm('bgm-1');
        expect(listener).toHaveBeenCalledWith('bgm-1');

        AudioManager.stopBgm();
        expect(listener).toHaveBeenLastCalledWith(null);

        unsubscribe();
        AudioManager.playBgm('bgm-1');
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
