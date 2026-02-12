import type { ResourceDefinition } from '../../domain/resourceSystem';

export const SHADOW_THIEF_RESOURCES: ResourceDefinition[] = [
    {
        id: 'cp',
        name: 'CP',
        initialValue: 2,
        min: 0,
        max: 15,
        icon: 'assets/dicethrone/images/Common/cp-icon.png',
        color: '#FFA500',
    },
    {
        id: 'hp',
        name: 'HP',
        initialValue: 50,
        min: 0,
        max: 50,
        icon: 'assets/dicethrone/images/Common/hp-icon.png',
        color: '#FF0000',
    },
];
