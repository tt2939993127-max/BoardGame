import type { ISourceOptions } from '@tsparticles/engine';

export interface ParticleLease {
    slotId: string;
    leaseId: number;
}

export interface ParticlePoolSlot {
    id: string;
    inUse: boolean;
    leaseId: number;
    lastUsedAt: number;
    target: HTMLElement | null;
    options: ISourceOptions | null;
    label?: string;
}

export interface ParticleAcquireParams {
    target: HTMLElement;
    options: ISourceOptions;
    label?: string;
}

export interface ParticleAcquireResult {
    lease: ParticleLease;
    reused: boolean;
}

export const DEFAULT_PARTICLE_POOL_SIZE = 12;

export function createParticlePoolStore(size = DEFAULT_PARTICLE_POOL_SIZE) {
    const slots: ParticlePoolSlot[] = Array.from({ length: size }, (_, index) => ({
        id: `particle-slot-${index}`,
        inUse: false,
        leaseId: 0,
        lastUsedAt: 0,
        target: null,
        options: null,
        label: undefined,
    }));

    const acquire = (params: ParticleAcquireParams): ParticleAcquireResult => {
        const now = Date.now();
        let reused = false;
        let slot = slots.find((item) => !item.inUse) ?? null;

        if (!slot) {
            reused = true;
            slot = slots.reduce((oldest, current) => (current.lastUsedAt < oldest.lastUsedAt ? current : oldest), slots[0]);
        }

        slot.inUse = true;
        slot.leaseId = slot.leaseId + 1;
        slot.lastUsedAt = now;
        slot.target = params.target;
        slot.options = params.options;
        slot.label = params.label;

        return {
            lease: { slotId: slot.id, leaseId: slot.leaseId },
            reused,
        };
    };

    const release = (lease: ParticleLease): boolean => {
        const slot = slots.find((item) => item.id === lease.slotId);
        if (!slot) return false;
        if (slot.leaseId !== lease.leaseId) return false;
        slot.inUse = false;
        slot.target = null;
        slot.options = null;
        slot.label = undefined;
        return true;
    };

    return {
        slots,
        acquire,
        release,
    };
}
