
export interface FactionMeta {
    id: string;
    name: string;
    icon: string; // Emoji
    color: string;
    description: string;
}

export const FACTION_METADATA: FactionMeta[] = [
    { id: 'pirates', name: '海盗', icon: '🏴‍☠️', color: '#1e293b', description: '高机动性，可以在基地间移动随从。' },
    { id: 'ninjas', name: '忍者', icon: '🥷', color: '#7f1d1d', description: '出其不意，隐蔽行动，暗杀随从。' },
    { id: 'dinosaurs', name: '恐龙', icon: '🦖', color: '#15803d', description: '巨大的力量，无坚不摧。' },
    { id: 'aliens', name: '外星人', icon: '👽', color: '#0ea5e9', description: '干扰对手，将随从送回手牌，控制基地。' },
    { id: 'robots', name: '机器人', icon: '🤖', color: '#475569', description: '微型机器人大军，快速铺场。' },
    { id: 'zombies', name: '丧尸', icon: '🧟', color: '#10b981', description: '从弃牌堆复活，永不消逝。' },
    { id: 'wizards', name: '巫师', icon: '🧙‍♂️', color: '#8b5cf6', description: '额外的行动，操控牌库，法术轰炸。' },
    { id: 'tricksters', name: '捣蛋鬼', icon: '🤡', color: '#f59e0b', description: '设置陷阱，弃置对手手牌，制造混乱。' },
    { id: 'steampunks', name: '蒸汽朋克', icon: '⚙️', color: '#b45309', description: '利用基地行动卡，升级与回收。' },
    { id: 'ghosts', name: '幽灵', icon: '👻', color: '#fca5a5', description: '手牌越少越强，穿过物质。' },
    { id: 'plants', name: '食人花', icon: '🪴', color: '#4d7c0f', description: '快速生长，控制随从。' },
    { id: 'bear_cavalry', name: '熊骑兵', icon: '🐻', color: '#7c2d12', description: '强迫移动对手，无情碾压。' },
    { id: 'cthulhu', name: '克苏鲁仆从', icon: '🐙', color: '#4c1d95', description: '利用疯狂牌，献祭随从。' },
    { id: 'elder_things', name: '远古物种', icon: '🧊', color: '#0e7490', description: '给予疯狂牌，控制人心。' },
    { id: 'innsmouth', name: '印斯茅斯', icon: '🐟', color: '#06b6d4', description: '人海战术，同样的随从集结。' },
    { id: 'miskatonic', name: '米斯卡塔尼克', icon: '🎓', color: '#fcd34d', description: '利用疯狂牌获得优势，研究知识。' },
];

export function getFactionMeta(id: string): FactionMeta | undefined {
    return FACTION_METADATA.find(f => f.id === id);
}
