import {
    createAbilityRegistry,
    type AbilityDef,
} from '../../../engine/primitives/ability';
import type {
    GameConfigAbilityDefinition,
    GameConfigObject,
} from '../../../game-config';
import { materializeMageWarsConfigPackage } from '../data/configPackage';

export const MAGE_WARS_SPELL_ABILITY_PREFIX = 'mw.spell';

export type MageWarsAbilityImplementationStatus = 'implemented' | 'needs-code';

export type MageWarsAbilityTrigger = 'spell-cast';

export type MageWarsSpellAbilityEffect = {
    type: 'requires-code-support';
    objectId: string;
    cardId: number;
    spellType: string;
    summary: string;
};

export interface MageWarsSpellAbilityMeta {
    objectId: string;
    cardId: number;
    spellType: string;
    implementationStatus: MageWarsAbilityImplementationStatus;
    typeLine?: string;
    range?: string;
    targetRule?: string;
    printCode?: string;
    sourceContract?: string;
}

export interface MageWarsSpellAbilityDef extends AbilityDef<MageWarsSpellAbilityEffect, MageWarsAbilityTrigger> {
    meta: MageWarsSpellAbilityMeta;
}

export interface MageWarsAbilityGapSummary {
    total: number;
    implemented: number;
    needsCode: number;
    bySpellType: Record<string, {
        total: number;
        implemented: number;
        needsCode: number;
    }>;
}

function isApprenticeSpellObject(object: GameConfigObject): boolean {
    return object.tags?.includes('apprentice-spell') === true;
}

function readNumber(value: unknown, context: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`invalid Mage Wars spell ability number at ${context}`);
    }
    return value;
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getMageWarsSpellAbilityId(cardId: number): string {
    return `${MAGE_WARS_SPELL_ABILITY_PREFIX}.${cardId}`;
}

export function buildMageWarsSpellAbilityDefs(): MageWarsSpellAbilityDef[] {
    return materializeMageWarsConfigPackage().package.objects
        .filter(isApprenticeSpellObject)
        .map((object) => {
            const data = object.data ?? {};
            const cardId = readNumber(data.cardId, `${object.id}.data.cardId`);
            const spellType = readString(data.spellType, 'unknown');
            const implementationStatus: MageWarsAbilityImplementationStatus = data.requiresCodeSupport === true
                ? 'needs-code'
                : 'implemented';
            const effectSummary = object.text ?? readString(data.attackOrTraitLine, object.name);
            const effects: MageWarsSpellAbilityEffect[] = implementationStatus === 'needs-code'
                ? [{
                    type: 'requires-code-support',
                    objectId: object.id,
                    cardId,
                    spellType,
                    summary: effectSummary,
                }]
                : [];

            return {
                id: getMageWarsSpellAbilityId(cardId),
                name: object.name,
                description: object.text,
                trigger: 'spell-cast',
                effects,
                tags: [
                    'mage-wars',
                    'apprentice-spell',
                    `spell-type:${spellType}`,
                    `implementation:${implementationStatus}`,
                    ...(object.tags ?? []),
                ],
                meta: {
                    objectId: object.id,
                    cardId,
                    spellType,
                    implementationStatus,
                    typeLine: readOptionalString(data.typeLine),
                    range: readOptionalString(data.range),
                    targetRule: readOptionalString(data.targetRule),
                    printCode: readOptionalString(data.printCode),
                    sourceContract: readOptionalString(data.sourceContract),
                },
            };
        });
}

export const mageWarsAbilityRegistry = createAbilityRegistry<MageWarsSpellAbilityDef>('mage-wars-spell-abilities');
mageWarsAbilityRegistry.registerAll(buildMageWarsSpellAbilityDefs());

export function getMageWarsSpellAbilityDef(cardId: number): MageWarsSpellAbilityDef | undefined {
    return mageWarsAbilityRegistry.get(getMageWarsSpellAbilityId(cardId));
}

export function buildMageWarsConfigAbilityCatalog(): Record<string, GameConfigAbilityDefinition> {
    return Object.fromEntries(mageWarsAbilityRegistry.getAll().map((def) => [
        def.id,
        {
            abilityId: def.id,
            implementationStatus: def.meta.implementationStatus,
            allowExtraParams: true,
        },
    ]));
}

export function summarizeMageWarsAbilityGaps(): MageWarsAbilityGapSummary {
    const summary: MageWarsAbilityGapSummary = {
        total: 0,
        implemented: 0,
        needsCode: 0,
        bySpellType: {},
    };

    for (const def of mageWarsAbilityRegistry.getAll()) {
        const bucket = summary.bySpellType[def.meta.spellType] ?? {
            total: 0,
            implemented: 0,
            needsCode: 0,
        };
        summary.total += 1;
        bucket.total += 1;
        if (def.meta.implementationStatus === 'implemented') {
            summary.implemented += 1;
            bucket.implemented += 1;
        } else {
            summary.needsCode += 1;
            bucket.needsCode += 1;
        }
        summary.bySpellType[def.meta.spellType] = bucket;
    }

    return summary;
}
