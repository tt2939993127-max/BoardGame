import type {
    GameManifestEntry,
    GameSetupField,
    GameSetupMultiSelectField,
    GameSetupSelectField,
} from './manifest.types';

export type GameSetupValue = string | string[];
export type GameSetupSelections = Record<string, GameSetupValue>;

export function isSelectField(field: GameSetupField): field is GameSetupSelectField {
    return field.type === 'select';
}

export function isMultiSelectField(field: GameSetupField): field is GameSetupMultiSelectField {
    return field.type === 'multi-select';
}

export function getDefaultSetupSelections(
    gameManifest: Pick<GameManifestEntry, 'setupOptions'> | undefined,
): GameSetupSelections {
    const selections: GameSetupSelections = {};
    const fields = gameManifest?.setupOptions ?? {};

    for (const [fieldKey, field] of Object.entries(fields)) {
        if (isMultiSelectField(field)) {
            selections[fieldKey] = [...(field.default ?? field.options.map((option) => option.value))];
            continue;
        }
        selections[fieldKey] = field.default ?? field.options[0]?.value ?? '';
    }

    return selections;
}

export function normalizeSetupSelections(
    gameManifest: Pick<GameManifestEntry, 'setupOptions'> | undefined,
    rawSelections?: Record<string, unknown> | null,
): GameSetupSelections {
    const defaults = getDefaultSetupSelections(gameManifest);
    const fields = gameManifest.setupOptions ?? {};

    if (!rawSelections) {
        return defaults;
    }

    const normalized: GameSetupSelections = { ...defaults };

    for (const [fieldKey, field] of Object.entries(fields)) {
        const rawValue = rawSelections[fieldKey];
        const allowedValues = new Set(field.options.map((option) => option.value));

        if (isMultiSelectField(field)) {
            if (!Array.isArray(rawValue)) {
                continue;
            }
            normalized[fieldKey] = rawValue.filter(
                (value): value is string => typeof value === 'string' && allowedValues.has(value),
            );
            continue;
        }

        if (typeof rawValue === 'string' && allowedValues.has(rawValue)) {
            normalized[fieldKey] = rawValue;
        }
    }

    return normalized;
}
