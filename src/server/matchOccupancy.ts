export type PlayerSeat = {
    name?: string;
    credentials?: string;
    isConnected?: boolean | null;
};

export const isSeatOccupied = (player?: PlayerSeat | null): boolean => {
    if (!player) return false;
    return Boolean(player.name);
};

export const hasOccupiedPlayers = (players?: Record<string, PlayerSeat> | null): boolean => {
    if (!players) return false;
    return Object.values(players).some(isSeatOccupied);
};
