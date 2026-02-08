import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ISourceOptions } from '@tsparticles/engine';
import { createPortal } from 'react-dom';
import { getParticlesComponent, type ParticlesComponent } from './particleEngine';
import {
    createParticlePoolStore,
    type ParticleAcquireParams,
    type ParticleAcquireResult,
    type ParticleLease,
    type ParticlePoolSlot,
    DEFAULT_PARTICLE_POOL_SIZE,
} from './particlePoolStore';

interface ParticlePoolContextValue {
    slots: ParticlePoolSlot[];
    acquire: (params: ParticleAcquireParams) => ParticleAcquireResult;
    release: (lease: ParticleLease) => boolean;
}

const ParticlePoolContext = createContext<ParticlePoolContextValue | null>(null);

const EMPTY_PARTICLE_OPTIONS: ISourceOptions = {
    fullScreen: { enable: false, zIndex: 0 },
    detectRetina: true,
    fpsLimit: 30,
    particles: { number: { value: 0 } },
};

/**
 * 粒子对象池 Provider（全局入口）
 * - 复用固定数量的粒子实例
 * - 统一由 ParticlePoolRoot 渲染
 */
export const ParticlePoolProvider: React.FC<{
    children: React.ReactNode;
    size?: number;
}> = ({ children, size = DEFAULT_PARTICLE_POOL_SIZE }) => {
    const storeRef = useRef(createParticlePoolStore(size));
    const [, forceUpdate] = useState(0);

    const acquire = useCallback((params: ParticleAcquireParams) => {
        const result = storeRef.current.acquire(params);
        forceUpdate((prev) => prev + 1);
        return result;
    }, []);

    const release = useCallback((lease: ParticleLease) => {
        const ok = storeRef.current.release(lease);
        if (ok) {
            forceUpdate((prev) => prev + 1);
        }
        return ok;
    }, []);

    const value = useMemo<ParticlePoolContextValue>(() => ({
        slots: storeRef.current.slots,
        acquire,
        release,
    }), [acquire, release]);

    return (
        <ParticlePoolContext.Provider value={value}>
            {children}
            <ParticlePoolRoot />
        </ParticlePoolContext.Provider>
    );
};

export const useParticlePool = () => useContext(ParticlePoolContext);

const ParticlePoolRoot: React.FC = () => {
    const pool = useParticlePool();
    const [ParticlesComp, setParticlesComp] = useState<ParticlesComponent | null>(null);
    const hiddenContainerRef = useRef<HTMLDivElement>(null);
    const [fallbackTarget, setFallbackTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (hiddenContainerRef.current) {
            setFallbackTarget(hiddenContainerRef.current);
        }
    }, [hiddenContainerRef]);

    useEffect(() => {
        let mounted = true;
        void getParticlesComponent().then((Comp) => {
            if (mounted) {
                setParticlesComp(() => Comp);
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    if (!pool) return null;

    return (
        <>
            <div
                ref={hiddenContainerRef}
                aria-hidden
                style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
            />
            {ParticlesComp && fallbackTarget && pool.slots.map((slot) => (
                <ParticlePoolSlotRenderer
                    key={slot.id}
                    slot={slot}
                    fallbackTarget={fallbackTarget}
                    ParticlesComp={ParticlesComp}
                />
            ))}
        </>
    );
};

const ParticlePoolSlotRenderer: React.FC<{
    slot: ParticlePoolSlot;
    fallbackTarget: HTMLElement;
    ParticlesComp: ParticlesComponent;
}> = ({ slot, fallbackTarget, ParticlesComp }) => {
    const target = slot.target ?? fallbackTarget;
    if (!target) return null;

    const active = slot.inUse;
    const options = (active ? slot.options : null) ?? EMPTY_PARTICLE_OPTIONS;

    return createPortal(
        <div
            className="absolute inset-0 pointer-events-none"
            style={{ display: active ? 'block' : 'none' }}
            data-particle-slot={slot.id}
        >
            <ParticlesComp id={slot.id} options={options} />
        </div>,
        target
    );
};

export default ParticlePoolProvider;
