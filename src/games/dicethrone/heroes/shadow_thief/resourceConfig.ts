import type { ResourceDefinition } from '../../domain/resourceSystem';

export const SHADOW_THIEF_RESOURCES: ResourceDefinition[] = [
    {
        id: 'cp',
        name: 'CP',
        initialValue: 2,
        min: 0,
        max: 15,
        icon: '⚡',
        color: '#FFA500',
    },
    {
        id: 'hp',
        name: 'HP',
        initialValue: 50,
        min: 0,
        max: 50,
        icon: '❤️',
        color: '#FF0000',
    },
];
