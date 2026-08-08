import { describe, expect, it } from 'vitest';
import { SMASHUP_FACTION_IDS } from '../domain/ids';
import { SMASHUP_FACTION_PARTICIPATION_GROUPS } from '../factionParticipationPool';
import {
    getFactionVariantGroupById,
    getPreferredFactionVariant,
    getVisibleFactionVariantGroups,
} from '../ui/factionMeta';

describe('SmashUp faction variant groups', () => {
    it('merges base and POD into one visible group in zh-CN', () => {
        const groups = getVisibleFactionVariantGroups('zh-CN');
        const piratesGroup = groups.find((group) => group.groupId === SMASHUP_FACTION_IDS.PIRATES);

        expect(piratesGroup).toBeTruthy();
        expect(piratesGroup?.variants.map((variant) => variant.id)).toEqual([
            SMASHUP_FACTION_IDS.PIRATES,
            SMASHUP_FACTION_IDS.PIRATES_POD,
        ]);
        expect(piratesGroup?.defaultVariant.id).toBe(SMASHUP_FACTION_IDS.PIRATES);
    });

    it('prefers POD as the only visible default variant in en', () => {
        const groups = getVisibleFactionVariantGroups('en');
        const piratesGroup = groups.find((group) => group.groupId === SMASHUP_FACTION_IDS.PIRATES);

        expect(piratesGroup).toBeTruthy();
        expect(piratesGroup?.variants.map((variant) => variant.id)).toEqual([
            SMASHUP_FACTION_IDS.PIRATES_POD,
        ]);
        expect(piratesGroup?.defaultVariant.id).toBe(SMASHUP_FACTION_IDS.PIRATES_POD);
    });

    it('normalizes a POD faction id back to its shared group', () => {
        const group = getFactionVariantGroupById(SMASHUP_FACTION_IDS.WIZARDS_POD);

        expect(group?.groupId).toBe(SMASHUP_FACTION_IDS.WIZARDS);
        expect(group?.variants.map((variant) => variant.id)).toEqual([
            SMASHUP_FACTION_IDS.WIZARDS,
            SMASHUP_FACTION_IDS.WIZARDS_POD,
        ]);
    });

    it('returns locale-aware preferred variants', () => {
        expect(getPreferredFactionVariant(SMASHUP_FACTION_IDS.ZOMBIES, 'zh-CN')?.id).toBe(SMASHUP_FACTION_IDS.ZOMBIES);
        expect(getPreferredFactionVariant(SMASHUP_FACTION_IDS.ZOMBIES, 'en')?.id).toBe(SMASHUP_FACTION_IDS.ZOMBIES_POD);
    });

    it('hides DIY factions when the diy expansion is disabled', () => {
        const groups = getVisibleFactionVariantGroups('zh-CN', ['titans']);
        const groupIds = groups.map((group) => group.groupId);

        expect(groupIds).not.toContain(SMASHUP_FACTION_IDS.HULUWAWA);
        expect(groupIds).toContain(SMASHUP_FACTION_IDS.PALADINS);
        expect(getPreferredFactionVariant(SMASHUP_FACTION_IDS.HULUWAWA, 'zh-CN', ['titans'])).toBeUndefined();
        expect(getPreferredFactionVariant(SMASHUP_FACTION_IDS.PALADINS, 'zh-CN', ['titans'])?.id)
            .toBe(SMASHUP_FACTION_IDS.PALADINS);
    });

    it('keeps Paladins in single faction packs instead of the DIY/custom group', () => {
        const singleFactionPacks = SMASHUP_FACTION_PARTICIPATION_GROUPS
            .find((group) => group.id === 'single_faction_packs');
        const customGroup = SMASHUP_FACTION_PARTICIPATION_GROUPS
            .find((group) => group.id === 'custom');

        expect(singleFactionPacks?.factionIds).toContain(SMASHUP_FACTION_IDS.PALADINS);
        expect(customGroup?.factionIds).not.toContain(SMASHUP_FACTION_IDS.PALADINS);
    });
});
