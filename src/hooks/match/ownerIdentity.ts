import type { TFunction } from 'i18next';

const GUEST_ID_KEY = 'guest_id';

export const getOrCreateGuestId = (): string => {
    if (typeof window === 'undefined') return 'guest';
    const stored = localStorage.getItem(GUEST_ID_KEY);
    if (stored) return stored;
    const id = String(Math.floor(Math.random() * 9000) + 1000);
    localStorage.setItem(GUEST_ID_KEY, id);
    return id;
};

export const getGuestName = (t: TFunction, guestId?: string): string => {
    const id = guestId || getOrCreateGuestId();
    return t('player.guest', { id, ns: 'lobby' });
};

export const getOwnerKey = (userId?: string | null, guestId?: string): string => {
    if (userId) return `user:${userId}`;
    const resolvedGuestId = guestId || getOrCreateGuestId();
    return `guest:${resolvedGuestId}`;
};

export const getOwnerType = (userId?: string | null): 'user' | 'guest' => (userId ? 'user' : 'guest');
