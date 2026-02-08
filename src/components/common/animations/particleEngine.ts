import type { ComponentType } from 'react';
import type { IParticlesProps } from '@tsparticles/react';

export type ParticlesComponent = ComponentType<IParticlesProps>;

/** 引擎初始化缓存（全局单例，避免重复初始化） */
let engineInitPromise: Promise<ParticlesComponent> | null = null;

export async function getParticlesComponent(): Promise<ParticlesComponent> {
    if (!engineInitPromise) {
        engineInitPromise = (async () => {
            const [{ initParticlesEngine, Particles }, { loadSlim }] = await Promise.all([
                import('@tsparticles/react'),
                import('@tsparticles/slim'),
            ]);
            await initParticlesEngine(async (engine) => {
                await loadSlim(engine);
            });
            return Particles;
        })();
    }
    return engineInitPromise;
}
