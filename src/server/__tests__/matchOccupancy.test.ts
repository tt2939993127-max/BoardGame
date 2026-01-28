import { describe, it, expect } from 'vitest';
import { hasOccupiedPlayers, isSeatOccupied } from '../matchOccupancy';

describe('matchOccupancy', () => {
    it('isSeatOccupied: 仅 name 存在视为占座', () => {
        expect(isSeatOccupied({ name: 'P1' })).toBe(true);
        expect(isSeatOccupied({ credentials: 'cred' })).toBe(false);
        expect(isSeatOccupied({ isConnected: true })).toBe(false);
        expect(isSeatOccupied({})).toBe(false);
        expect(isSeatOccupied(undefined)).toBe(false);
    });

    it('hasOccupiedPlayers: 任意玩家占座返回 true', () => {
        expect(hasOccupiedPlayers(undefined)).toBe(false);
        expect(hasOccupiedPlayers({ 0: { id: 0 } as any, 1: { id: 1 } as any })).toBe(false);
        expect(hasOccupiedPlayers({ 0: { name: 'P0' } as any, 1: { id: 1 } as any })).toBe(true);
    });
});
