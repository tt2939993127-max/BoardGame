import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventStreamEntry } from '../../types';
import { EventStreamRollbackContext, type EventStreamRollbackValue } from '../EventStreamRollbackContext';
import { useEventStreamCursor } from '../useEventStreamCursor';

function createEntry(id: number, type: string): EventStreamEntry {
    return {
        id,
        event: {
            type,
            payload: {},
            timestamp: id * 1000,
        },
    } as EventStreamEntry;
}

describe('useEventStreamCursor', () => {
    it('consumeOnReconcile=true 时会在 reconcile 后继续消费确认事件', () => {
        let rollbackValue: EventStreamRollbackValue = {
            watermark: null,
            seq: 0,
            reconcileSeq: 0,
        };

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(
                EventStreamRollbackContext.Provider,
                { value: rollbackValue },
                children,
            );

        const initialEntries = [createEntry(1, 'OLD_EVENT')];
        const { result, rerender } = renderHook(
            ({ entries, consumeOnReconcile }: { entries: EventStreamEntry[]; consumeOnReconcile?: boolean }) =>
                useEventStreamCursor({ entries, consumeOnReconcile }),
            {
                initialProps: {
                    entries: initialEntries,
                    consumeOnReconcile: true,
                },
                wrapper,
            },
        );

        act(() => {
            result.current.consumeNew();
        });

        rollbackValue = {
            watermark: null,
            seq: 0,
            reconcileSeq: 1,
        };

        rerender({
            entries: [
                ...initialEntries,
                createEntry(2, 'CARD_PLAYED'),
                createEntry(3, 'BONUS_DIE_ROLLED'),
            ],
            consumeOnReconcile: true,
        });

        let consumedTypes: string[] = [];
        act(() => {
            consumedTypes = result.current.consumeNew().entries.map((entry) => entry.event.type);
        });

        expect(consumedTypes).toEqual(['CARD_PLAYED', 'BONUS_DIE_ROLLED']);
    });

    it('consumeOnReconcile=false 时保持 reconcile 静默同步游标', () => {
        let rollbackValue: EventStreamRollbackValue = {
            watermark: null,
            seq: 0,
            reconcileSeq: 0,
        };

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(
                EventStreamRollbackContext.Provider,
                { value: rollbackValue },
                children,
            );

        const initialEntries = [createEntry(1, 'OLD_EVENT')];
        const { result, rerender } = renderHook(
            ({ entries }: { entries: EventStreamEntry[] }) =>
                useEventStreamCursor({ entries }),
            {
                initialProps: { entries: initialEntries },
                wrapper,
            },
        );

        act(() => {
            result.current.consumeNew();
        });

        rollbackValue = {
            watermark: null,
            seq: 0,
            reconcileSeq: 1,
        };

        rerender({
            entries: [
                ...initialEntries,
                createEntry(2, 'CARD_PLAYED'),
                createEntry(3, 'BONUS_DIE_ROLLED'),
            ],
        });

        let consumedCount = -1;
        act(() => {
            consumedCount = result.current.consumeNew().entries.length;
        });

        expect(consumedCount).toBe(0);
    });
});
