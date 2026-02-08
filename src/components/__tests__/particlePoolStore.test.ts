import { describe, expect, it, vi } from 'vitest';
import { createParticlePoolStore } from '../common/animations/particlePoolStore';

const buildOptions = (label: string) => ({
    fullScreen: { enable: false, zIndex: 0 },
    detectRetina: true,
    fpsLimit: 30,
    particles: { number: { value: 1 }, color: { value: label } },
});

describe('particlePoolStore', () => {
    it('acquire 返回空闲 slot 并标记占用', () => {
        const store = createParticlePoolStore(2);
        const target = {} as HTMLElement;
        const result = store.acquire({ target, options: buildOptions('a') });
        const slot = store.slots.find((item) => item.id === result.lease.slotId);
        expect(slot?.inUse).toBe(true);
        expect(slot?.target).toBe(target);
        expect(result.reused).toBe(false);
    });

    it('池满时复用最旧 slot', () => {
        const store = createParticlePoolStore(2);
        const target = {} as HTMLElement;
        const nowSpy = vi.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(3000);

        const first = store.acquire({ target, options: buildOptions('a') });
        const second = store.acquire({ target, options: buildOptions('b') });
        const third = store.acquire({ target, options: buildOptions('c') });

        expect(first.lease.slotId).not.toBe(second.lease.slotId);
        expect(third.reused).toBe(true);
        expect(third.lease.slotId).toBe(first.lease.slotId);

        nowSpy.mockRestore();
    });

    it('release 失败时不影响 slot', () => {
        const store = createParticlePoolStore(1);
        const target = {} as HTMLElement;
        const { lease } = store.acquire({ target, options: buildOptions('a') });
        const ok = store.release({ slotId: lease.slotId, leaseId: lease.leaseId + 1 });
        expect(ok).toBe(false);
        const slot = store.slots[0];
        expect(slot.inUse).toBe(true);
    });

    it('release 成功后清理 slot 状态', () => {
        const store = createParticlePoolStore(1);
        const target = {} as HTMLElement;
        const { lease } = store.acquire({ target, options: buildOptions('a') });
        const ok = store.release(lease);
        expect(ok).toBe(true);
        const slot = store.slots[0];
        expect(slot.inUse).toBe(false);
        expect(slot.target).toBeNull();
        expect(slot.options).toBeNull();
    });
});
