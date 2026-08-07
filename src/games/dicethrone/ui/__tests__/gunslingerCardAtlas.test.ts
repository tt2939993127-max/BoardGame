import { describe, expect, it } from 'vitest';

import { getCardAtlasSource } from '../../../../components/common/media/cardAtlasRegistry';
import { GUNSLINGER_CARDS } from '../../heroes/gunslinger/cards';
import '../cardAtlas';

describe('DiceThrone 枪手手牌图集', () => {
    it('三张复合升级牌应各自裁为完整物理卡面，且运行时索引不跳槽', () => {
        const source = getCardAtlasSource('dicethrone:gunslinger-cards');

        expect(source).toBeDefined();
        expect(source?.config).toHaveProperty('frames');

        if (!source || !('frames' in source.config)) {
            return;
        }

        expect(source.config.frames[22]).toEqual({
            x: 387,
            y: 591,
            width: 165,
            height: 270,
        });
        expect(source.config.frames[23]).toEqual({
            x: 572,
            y: 591,
            width: 165,
            height: 269,
        });
        expect(source.config.frames[24]).toEqual({
            x: 757,
            y: 591,
            width: 165,
            height: 269,
        });

        const previewIndexByCardId = new Map(
            GUNSLINGER_CARDS.map((card) => [
                card.id,
                card.previewRef?.type === 'atlas' ? card.previewRef.index : undefined,
            ]),
        );
        expect(previewIndexByCardId.get('upgrade-fan-the-hammer-2')).toBe(22);
        expect(previewIndexByCardId.get('upgrade-take-cover-2')).toBe(23);
        expect(previewIndexByCardId.get('upgrade-deadeye-2')).toBe(24);
        expect(previewIndexByCardId.get('upgrade-duel-2')).toBe(25);
        expect(previewIndexByCardId.get('upgrade-quick-draw')).toBe(26);
    });

    it('吃我的铅弹应使用图集末行第二张的实际卡面区域', () => {
        const source = getCardAtlasSource('dicethrone:gunslinger-cards');

        expect(source).toBeDefined();
        expect(source?.config).toHaveProperty('frames');

        if (!source || !('frames' in source.config)) {
            return;
        }

        expect(source.config.frames[31]).toEqual({
            x: 202,
            y: 886,
            width: 165,
            height: 268,
        });
    });
});
