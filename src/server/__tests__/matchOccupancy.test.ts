import { describe, it, expect } from 'vitest';
import { hasOccupiedPlayers, isSeatOccupied } from '../matchOccupancy';

describe('matchOccupancy', () => {
    it('isSeatOccupied: name/credentials/isConnected 任一成立视为占座', () => {
        expect(isSeatOccupied({ name: 'P1' })).toBe(true);
        expect(isSeatOccupied({ credentials: 'cred' })).toBe(true);
        expect(isSeatOccupied({ isConnected: true })).toBe(true);
        expect(isSeatOccupied({})).toBe(false);
        expect(isSeatOccupied(undefined)).toBe(false);
    });

    it('hasOccupiedPlayers: 任意玩家占座返回 true', () => {
        expect(hasOccupiedPlayers(undefined)).toBe(false);
        expect(hasOccupiedPlayers({ 0: { id: 0 } as any, 1: { id: 1 } as any })).toBe(false);
        expect(hasOccupiedPlayers({ 0: { name: 'P0' } as any, 1: { id: 1 } as any })).toBe(true);
    });
});
