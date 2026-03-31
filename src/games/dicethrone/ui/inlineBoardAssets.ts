import barbarianBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/barbarian/compressed/player-board.webp?inline';
import barbarianTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/barbarian/compressed/tip.webp?inline';
import gunslingerBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/gunslinger/compressed/player-board.webp?inline';
import gunslingerTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/gunslinger/compressed/tip.webp?inline';
import monkBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/monk/compressed/player-board.webp?inline';
import monkTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/monk/compressed/tip.webp?inline';
import moonElfBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/moon_elf/compressed/player-board.webp?inline';
import moonElfTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/moon_elf/compressed/tip.webp?inline';
import paladinBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/paladin/compressed/player-board.webp?inline';
import paladinTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/paladin/compressed/tip.webp?inline';
import pyromancerBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/pyromancer/compressed/player-board.webp?inline';
import pyromancerTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/pyromancer/compressed/tip.webp?inline';
import samuraiBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/samurai/compressed/player-board.webp?inline';
import samuraiTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/samurai/compressed/tip.webp?inline';
import shadowThiefBoardZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/shadow_thief/compressed/player-board.webp?inline';
import shadowThiefTipZh from '../../../../public/assets/i18n/zh-CN/dicethrone/images/shadow_thief/compressed/tip.webp?inline';

type BoardAssetKind = 'player-board' | 'tip';

type BoardAssetMap = Record<string, Record<BoardAssetKind, string>>;

const INLINE_BOARD_ASSETS_ZH: BoardAssetMap = {
  barbarian: { 'player-board': barbarianBoardZh, tip: barbarianTipZh },
  gunslinger: { 'player-board': gunslingerBoardZh, tip: gunslingerTipZh },
  monk: { 'player-board': monkBoardZh, tip: monkTipZh },
  moon_elf: { 'player-board': moonElfBoardZh, tip: moonElfTipZh },
  paladin: { 'player-board': paladinBoardZh, tip: paladinTipZh },
  pyromancer: { 'player-board': pyromancerBoardZh, tip: pyromancerTipZh },
  samurai: { 'player-board': samuraiBoardZh, tip: samuraiTipZh },
  shadow_thief: { 'player-board': shadowThiefBoardZh, tip: shadowThiefTipZh },
};

export const getInlineBoardAsset = (characterId: string | undefined, kind: BoardAssetKind, locale?: string) => {
  if (!characterId) return undefined;
  const normalizedLocale = (locale || 'zh-CN').toLowerCase();
  if (normalizedLocale.startsWith('zh')) {
    return INLINE_BOARD_ASSETS_ZH[characterId]?.[kind];
  }
  return INLINE_BOARD_ASSETS_ZH[characterId]?.[kind];
};
