import { MAGE_IDS, type MageId } from '../ids';

export type ApprenticeSpellbookMappingStatus =
    | 'single-candidate'
    | 'alias-single-candidate'
    | 'workshop-apprentice-instance-selected'
    | 'multiple-candidates';

export interface ApprenticeSpellbookEntry {
    quantity: number;
    rulesName: string;
    workshopName?: string;
    workshopCardIds: readonly number[];
    workshopDeckIds: readonly string[];
    mappingStatus: ApprenticeSpellbookMappingStatus;
}

export interface ApprenticeMageSetup {
    mageId: MageId;
    displayName: string;
    startingLife: number;
    startingMana: number;
    channeling: number;
    baseMeleeDice: number;
}

const entry = (
    quantity: number,
    rulesName: string,
    workshopCardIds: readonly number[],
    workshopDeckIds: readonly string[],
    mappingStatus: ApprenticeSpellbookMappingStatus = 'single-candidate',
    workshopName?: string,
): ApprenticeSpellbookEntry => ({
    quantity,
    rulesName,
    workshopName,
    workshopCardIds,
    workshopDeckIds,
    mappingStatus,
});

export const APPRENTICE_MAGE_SETUP = {
    [MAGE_IDS.BEASTMASTER_APPRENTICE]: {
        mageId: MAGE_IDS.BEASTMASTER_APPRENTICE,
        displayName: '兽王',
        startingLife: 24,
        startingMana: 10,
        channeling: 10,
        baseMeleeDice: 3,
    },
    [MAGE_IDS.PRIESTESS_APPRENTICE]: {
        mageId: MAGE_IDS.PRIESTESS_APPRENTICE,
        displayName: '女祭司',
        startingLife: 24,
        startingMana: 10,
        channeling: 10,
        baseMeleeDice: 3,
    },
    [MAGE_IDS.WARLOCK_APPRENTICE]: {
        mageId: MAGE_IDS.WARLOCK_APPRENTICE,
        displayName: '邪术师',
        startingLife: 24,
        startingMana: 10,
        channeling: 10,
        baseMeleeDice: 3,
    },
    [MAGE_IDS.WIZARD_APPRENTICE]: {
        mageId: MAGE_IDS.WIZARD_APPRENTICE,
        displayName: '巫师',
        startingLife: 24,
        startingMana: 10,
        channeling: 10,
        baseMeleeDice: 3,
    },
} satisfies Record<MageId, ApprenticeMageSetup>;

export const APPRENTICE_MAGE_ORDER: readonly MageId[] = [
    MAGE_IDS.BEASTMASTER_APPRENTICE,
    MAGE_IDS.PRIESTESS_APPRENTICE,
    MAGE_IDS.WARLOCK_APPRENTICE,
    MAGE_IDS.WIZARD_APPRENTICE,
];

export const APPRENTICE_SPELLBOOKS = {
    [MAGE_IDS.BEASTMASTER_APPRENTICE]: [
        entry(1, '巨熊皮甲', [3711], ['37']),
        entry(1, '群兽法杖', [3710], ['37']),
        entry(1, '元素斗篷', [3709], ['37']),
        entry(2, '丛林灰狼', [2819], ['28']),
        entry(1, '翠绿树蜥', [2808], ['28']),
        entry(1, '钢爪灰熊', [2802], ['28']),
        entry(2, '苦木林狐', [2812], ['28']),
        entry(1, '雷隙猎鹰', [2820], ['28']),
        entry(1, '深林幽影切维尔', [2824], ['28']),
        entry(2, '野性山猫', [2906], ['29']),
        entry(2, '缠绕藤蔓（魔物）', [2224], ['22'], 'alias-single-candidate', '缠绕藤蔓'),
        entry(1, '反戈一击', [1903], ['19']),
        entry(1, '格挡', [1806], ['18']),
        entry(2, '巨熊力量', [1914], ['19']),
        entry(1, '灵蛇反射', [1809], ['18']),
        entry(1, '体肤重生', [1916], ['19']),
        entry(2, '犀牛兽皮', [1917], ['19']),
        entry(1, '冲锋陷阵', [3407], ['34']),
        entry(1, '次级治疗', [3402], ['34']),
        entry(1, '荒野呼唤', [3417], ['34']),
        entry(1, '驱散', [3606], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '群体治疗', [3405], ['34']),
        entry(1, '兽性觉醒', [3403], ['34']),
        entry(1, '瓦解', [3605], ['36'], 'workshop-apprentice-instance-selected'),
        entry(2, '间歇喷泉', [1710], ['17']),
        entry(1, '气流', [1711], ['17']),
    ],
    [MAGE_IDS.PRIESTESS_APPRENTICE]: [
        entry(1, '阿希拉法杖', [3706], ['37']),
        entry(1, '风龙皮甲', [3708], ['37']),
        entry(1, '偏移护腕', [3715], ['37']),
        entry(2, '阿希拉牧师', [2811], ['28']),
        entry(1, '布洛根·血石', [2813], ['28'], 'alias-single-candidate', '布洛根血石'),
        entry(1, '高地独角兽', [2814], ['28']),
        entry(1, '皇家箭手', [2816], ['28']),
        entry(1, '灰衣天使', [2907], ['29']),
        entry(2, '西锁骑士', [2909], ['29']),
        entry(1, '法力失效', [1901], ['19']),
        entry(2, '格挡', [1806], ['18']),
        entry(1, '公牛耐力', [1808], ['18']),
        entry(1, '神力加护', [1813], ['18'], 'workshop-apprentice-instance-selected'),
        entry(1, '圣佑领地', [1913], ['19']),
        entry(1, '犀牛兽皮', [1917], ['19']),
        entry(2, '心灵安抚', [1912], ['19']),
        entry(1, '次级治疗', [3402], ['34']),
        entry(1, '单体治疗', [3408], ['34']),
        entry(1, '昏睡', [3411], ['34']),
        entry(1, '驱散', [3606], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '群体治疗', [3405], ['34']),
        entry(1, '瓦解', [3605], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '原力推斥', [3523], ['35'], 'workshop-apprentice-instance-selected'),
        entry(2, '圣光之柱', [1706], ['17']),
        entry(1, '眩目闪光', [1709], ['17']),
    ],
    [MAGE_IDS.WARLOCK_APPRENTICE]: [
        entry(1, '恶魔胸甲', [3700], ['37']),
        entry(1, '皮革手套', [3702], ['37']),
        entry(1, '狱火长鞭', [3701], ['37']),
        entry(1, '暗契屠魔', [2800], ['28']),
        entry(1, '暗沼蝙蝠', [2825], ['28']),
        entry(2, '火烙魔婴', [2801], ['28']),
        entry(2, '骷髅哨兵', [2826], ['28']),
        entry(1, '狼人宠物戈伦', [2804], ['28']),
        entry(2, '烈焰狱鬼', [2803], ['28']),
        entry(1, '法师祸咒', [1804], ['18']),
        entry(1, '巨熊力量', [1914], ['19']),
        entry(1, '剧痛难当', [1800], ['18']),
        entry(1, '身心俱疲', [1816], ['18']),
        entry(1, '尸鬼腐化', [1820], ['18']),
        entry(1, '死亡链接', [1801], ['18']),
        entry(1, '死亡印记', [1826], ['18']),
        entry(1, '鲜血贪噬', [1910], ['19']),
        entry(2, '汲血之击', [3404], ['34']),
        entry(1, '驱散', [3606], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '生命汲取', [3400], ['34']),
        entry(1, '炎爆', [3401], ['34']),
        entry(1, '原力推斥', [3425], ['34'], 'workshop-apprentice-instance-selected'),
        entry(1, '火球术', [1700], ['17']),
        entry(1, '火焰风暴', [1701], ['17']),
        entry(2, '烈焰爆弹', [1702], ['17']),
    ],
    [MAGE_IDS.WIZARD_APPRENTICE]: [
        entry(1, '奥秘法杖', [3704], ['37']),
        entry(1, '龙鳞锁甲', [3703], ['37']),
        entry(1, '皮革长靴', [3721], ['37']),
        entry(1, '抑制斗篷', [3705], ['37']),
        entry(1, '元素魔杖', [3716], ['37']),
        entry(1, '暗沼九头蛇', [2901], ['29']),
        entry(1, '戈尔贡箭手', [2810], ['28']),
        entry(2, '汲法水蛭', [2807], ['28']),
        entry(2, '蓝色精怪', [2822], ['28']),
        entry(1, '石目蛇蜥', [2809], ['28']),
        entry(1, '厄运', [1825], ['18']),
        entry(1, '法力失效', [1901], ['19']),
        entry(1, '格挡', [1806], ['18']),
        entry(1, '攻击逆转', [1904], ['19']),
        entry(1, '精华汲取', [1815], ['18']),
        entry(1, '原力法剑', [1818], ['18']),
        entry(1, '原力之握', [1908], ['19']),
        entry(1, '传送', [3410], ['34']),
        entry(2, '次级治疗', [3402], ['34']),
        entry(1, '昏睡', [3411], ['34']),
        entry(1, '结界窃取', [3409], ['34']),
        entry(1, '驱散', [3606], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '瓦解', [3605], ['36'], 'workshop-apprentice-instance-selected'),
        entry(1, '雷导术', [1704], ['17']),
        entry(1, '连锁闪电', [1703], ['17']),
        entry(2, '闪电箭矢', [1705], ['17']),
    ],
} satisfies Record<MageId, readonly ApprenticeSpellbookEntry[]>;

export function getApprenticeMageSetup(mageId: MageId): ApprenticeMageSetup {
    return APPRENTICE_MAGE_SETUP[mageId];
}

export function getApprenticeSpellbook(mageId: MageId): readonly ApprenticeSpellbookEntry[] {
    return APPRENTICE_SPELLBOOKS[mageId];
}

export function getApprenticeSpellbookCount(mageId: MageId): number {
    return getApprenticeSpellbook(mageId).reduce((total, card) => total + card.quantity, 0);
}
