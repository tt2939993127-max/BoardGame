import { describe, expect, it } from 'vitest';

import { getCardAtlasSource } from '../../../../components/common/media/cardAtlasRegistry';
import '../cardAtlas';

describe('DiceThrone 枪手手牌图集', () => {
    it('吃我的铅弹应使用图集末行第二张的实际卡面区域', () => {
        const source = getCardAtlasSource('dicethrone:gunslinger-cards');

        expect(source).toBeDefined();
        expect(source?.config).toHaveProperty('frames');

        if (!source || !('frames' in source.config)) {
            return;
        }

        expect(source.config.frames[34]).toEqual({
            x: 202,
            y: 886,
            width: 165,
            height: 268,
        });
    });
});
