import { describe, it, expect } from 'vitest';
import { hasOccupiedPlayers, isSeatOccupied, type PlayerSeat } from '../matchOccupancy';

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
        const emptyPlayers: Record<string, PlayerSeat> = { 0: {}, 1: {} };
        const occupiedPlayers: Record<string, PlayerSeat> = { 0: { name: 'P0' }, 1: {} };
        expect(hasOccupiedPlayers(emptyPlayers)).toBe(false);
        expect(hasOccupiedPlayers(occupiedPlayers)).toBe(true);
    });
});
