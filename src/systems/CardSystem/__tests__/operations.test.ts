/**
 * CardSystem operations 纯函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  removeCard,
  drawFromTop,
  findCard,
  moveCard,
  drawCards,
  discardFromHand,
  playFromHand,
  recoverFromDiscard,
  removeFromHand,
  removeFromDiscard,
  shuffleDeck,
  reshuffleDiscardIntoDeck,
} from '../operations';

// 测试用卡牌
interface TestCard {
  id: string;
  name: string;
}

const card = (id: string, name = `卡牌${id}`): TestCard => ({ id, name });

describe('CardSystem operations', () => {
  describe('removeCard', () => {
    it('移除存在的卡牌', () => {
      const cards = [card('a'), card('b'), card('c')];
      const result = removeCard(cards, 'b');
      expect(result.card?.id).toBe('b');
      expect(result.remaining.map(c => c.id)).toEqual(['a', 'c']);
    });

    it('移除不存在的卡牌返回原数组', () => {
      const cards = [card('a'), card('b')];
      const result = removeCard(cards, 'x');
      expect(result.card).toBeUndefined();
      expect(result.remaining).toBe(cards); // 同引用
    });

    it('空数组', () => {
      const result = removeCard([], 'a');
      expect(result.card).toBeUndefined();
      expect(result.remaining).toEqual([]);
    });
  });

  describe('drawFromTop', () => {
    it('抽取指定数量', () => {
      const deck = [card('1'), card('2'), card('3'), card('4')];
      const result = drawFromTop(deck, 2);
      expect(result.drawn.map(c => c.id)).toEqual(['1', '2']);
      expect(result.remaining.map(c => c.id)).toEqual(['3', '4']);
    });

    it('抽取超过牌库数量时只抽实际数量', () => {
      const deck = [card('1')];
      const result = drawFromTop(deck, 5);
      expect(result.drawn.length).toBe(1);
      expect(result.remaining.length).toBe(0);
    });

    it('空牌库抽牌', () => {
      const result = drawFromTop([], 3);
      expect(result.drawn).toEqual([]);
      expect(result.remaining).toEqual([]);
    });
  });

  describe('findCard', () => {
    it('找到卡牌', () => {
      const cards = [card('a'), card('b')];
      expect(findCard(cards, 'b')?.id).toBe('b');
    });

    it('找不到返回 undefined', () => {
      expect(findCard([card('a')], 'x')).toBeUndefined();
    });
  });

  describe('moveCard', () => {
    it('成功移动', () => {
      const from = [card('a'), card('b'), card('c')];
      const to = [card('x')];
      const result = moveCard(from, to, 'b');
      expect(result.found).toBe(true);
      expect(result.card?.id).toBe('b');
      expect(result.from.map(c => c.id)).toEqual(['a', 'c']);
      expect(result.to.map(c => c.id)).toEqual(['x', 'b']);
    });

    it('卡牌不存在时返回原数组', () => {
      const from = [card('a')];
      const to = [card('x')];
      const result = moveCard(from, to, 'z');
      expect(result.found).toBe(false);
      expect(result.from).toBe(from);
      expect(result.to).toBe(to);
    });
  });

  describe('drawCards（语义化）', () => {
    it('从牌库抽牌到手牌', () => {
      const deck = [card('1'), card('2'), card('3')];
      const hand = [card('h1')];
      const result = drawCards(deck, hand, 2);
      expect(result.hand.map(c => c.id)).toEqual(['h1', '1', '2']);
      expect(result.deck.map(c => c.id)).toEqual(['3']);
    });
  });

  describe('discardFromHand', () => {
    it('从手牌弃置到弃牌堆', () => {
      const hand = [card('a'), card('b')];
      const discard = [card('d1')];
      const result = discardFromHand(hand, discard, 'a');
      expect(result.found).toBe(true);
      expect(result.from.map(c => c.id)).toEqual(['b']);
      expect(result.to.map(c => c.id)).toEqual(['d1', 'a']);
    });
  });

  describe('playFromHand', () => {
    it('与 discardFromHand 行为一致', () => {
      const hand = [card('a'), card('b')];
      const discard: TestCard[] = [];
      const result = playFromHand(hand, discard, 'b');
      expect(result.found).toBe(true);
      expect(result.from.map(c => c.id)).toEqual(['a']);
      expect(result.to.map(c => c.id)).toEqual(['b']);
    });
  });

  describe('recoverFromDiscard', () => {
    it('从弃牌堆回收到手牌', () => {
      const discard = [card('d1'), card('d2')];
      const hand = [card('h1')];
      const result = recoverFromDiscard(discard, hand, 'd1');
      expect(result.found).toBe(true);
      expect(result.from.map(c => c.id)).toEqual(['d2']);
      expect(result.to.map(c => c.id)).toEqual(['h1', 'd1']);
    });
  });

  describe('removeFromHand', () => {
    it('从手牌移除（不进弃牌堆）', () => {
      const hand = [card('a'), card('b'), card('c')];
      const result = removeFromHand(hand, 'b');
      expect(result.card?.id).toBe('b');
      expect(result.hand.map(c => c.id)).toEqual(['a', 'c']);
    });
  });

  describe('removeFromDiscard', () => {
    it('从弃牌堆移除', () => {
      const discard = [card('d1'), card('d2')];
      const result = removeFromDiscard(discard, 'd1');
      expect(result.card?.id).toBe('d1');
      expect(result.discard.map(c => c.id)).toEqual(['d2']);
    });
  });

  describe('shuffleDeck', () => {
    it('使用提供的 shuffle 函数', () => {
      const deck = [card('1'), card('2'), card('3')];
      // 反转作为 mock shuffle
      const reverse = <T,>(arr: T[]): T[] => [...arr].reverse();
      const result = shuffleDeck(deck, reverse);
      expect(result.map(c => c.id)).toEqual(['3', '2', '1']);
      // 原数组不变
      expect(deck.map(c => c.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('reshuffleDiscardIntoDeck', () => {
    it('将弃牌堆洗入牌库', () => {
      const deck = [card('d1')];
      const discard = [card('x1'), card('x2')];
      const identity = <T,>(arr: T[]): T[] => arr; // 不洗牌，方便断言
      const result = reshuffleDiscardIntoDeck(deck, discard, identity);
      expect(result.deck.map(c => c.id)).toEqual(['d1', 'x1', 'x2']);
      expect(result.discard).toEqual([]);
    });
  });

  describe('不可变性', () => {
    it('所有操作不修改原数组', () => {
      const hand = [card('a'), card('b')];
      const discard = [card('d1')];
      const handCopy = [...hand];
      const discardCopy = [...discard];

      discardFromHand(hand, discard, 'a');

      expect(hand).toEqual(handCopy);
      expect(discard).toEqual(discardCopy);
    });
  });
});
