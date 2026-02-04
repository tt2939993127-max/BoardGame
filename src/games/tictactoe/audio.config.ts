/**
 * 井字棋音频配置
 * 定义游戏所需的所有音效及其映射
 */
import type { AudioEvent, GameAudioConfig } from '../../lib/audio/types';

export const TIC_TAC_TOE_AUDIO_CONFIG: GameAudioConfig = {
    sounds: {
        // 落子音效
        place_x: { src: 'tictactoe/audio/compressed/move.ogg', volume: 0.8, category: { group: 'system', sub: 'place_x' } },
        place_o: { src: 'tictactoe/audio/compressed/move.ogg', volume: 0.8, category: { group: 'system', sub: 'place_o' } },
        // 游戏结果
        victory: { src: 'tictactoe/audio/compressed/win.ogg', volume: 1.0, category: { group: 'stinger', sub: 'victory' } },
        draw: { src: 'tictactoe/audio/compressed/draw_line.ogg', volume: 0.9, category: { group: 'stinger', sub: 'draw' } },
        // UI 音效
        hover: { src: 'common/audio/compressed/hover.ogg', volume: 0.3, category: { group: 'ui', sub: 'hover' } },
        click: { src: 'common/audio/compressed/click.ogg', volume: 0.5, category: { group: 'ui', sub: 'click' } },
    },
    eventSoundResolver: (event) => {
        if (event.type === 'CELL_OCCUPIED') {
            const payload = (event as AudioEvent & { payload?: { playerId?: string } }).payload;
            return payload?.playerId === '0' ? 'place_x' : 'place_o';
        }

        if (event.type === 'GAME_OVER') {
            const payload = (event as AudioEvent & { payload?: { draw?: boolean } }).payload;
            return payload?.draw ? 'draw' : 'victory';
        }

        return undefined;
    },
};
