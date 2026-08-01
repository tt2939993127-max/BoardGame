import { useLayoutEffect, useRef } from 'react';
import { useVisualEventStream } from '../../../components/game/framework/hooks/useVisualEventStream';
import type { FxBus } from '../../../engine/fx';
import { getEventStreamEntries } from '../../../engine/systems/EventStreamSystem';
import type { MatchState } from '../../../engine/types';
import type { MageWarsCore } from '../domain';
import { mapMageWarsEventToFx } from './eventFxMapper';

interface UseMageWarsGameEventsParams {
    G: MatchState<MageWarsCore>;
    fxBus: FxBus;
}

export function useMageWarsGameEvents({ G, fxBus }: UseMageWarsGameEventsParams): void {
    const fxBusRef = useRef(fxBus);
    useLayoutEffect(() => {
        fxBusRef.current = fxBus;
    }, [fxBus]);

    const entries = getEventStreamEntries(G);
    const { consumeNew } = useVisualEventStream({
        entries,
        strategy: 'requiredSequence',
    });

    useLayoutEffect(() => {
        const { entries: newEntries } = consumeNew();
        if (newEntries.length === 0) return;

        for (const entry of newEntries) {
            const instruction = mapMageWarsEventToFx(entry, G.core);
            if (!instruction) continue;
            fxBusRef.current.push(instruction.cue, instruction.ctx, instruction.params);
        }
    }, [G.core, consumeNew]);
}
