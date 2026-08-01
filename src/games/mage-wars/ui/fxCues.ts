export const MW_FX = {
    SPELL_CAST: 'mage-wars.spell.cast',
    ATTACK_IMPACT: 'mage-wars.attack.impact',
    DAMAGE_IMPACT: 'mage-wars.damage.impact',
} as const;

export type MageWarsFxCue = typeof MW_FX[keyof typeof MW_FX];
