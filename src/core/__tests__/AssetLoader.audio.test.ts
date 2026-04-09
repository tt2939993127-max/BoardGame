import { beforeEach, describe, expect, it } from 'vitest';
import {
    getOptimizedAudioUrl,
    setAssetHashesForTesting,
    setAssetsBaseUrl,
    setAudioAssetsBaseUrl,
    setCommonAudioAssetBaseOverride,
    setGameAssetBaseOverride,
    clearGameAssetBaseOverrides,
} from '../AssetLoader';

describe('AssetLoader.getOptimizedAudioUrl', () => {
    beforeEach(() => {
        setAssetsBaseUrl('/assets');
        setAudioAssetsBaseUrl('/assets');
        setCommonAudioAssetBaseOverride(undefined);
        clearGameAssetBaseOverrides();
        setAssetHashesForTesting({});
    });

    it('空路径返回空', () => {
        expect(getOptimizedAudioUrl('')).toBe('');
    });

    it('穿透源保持原样', () => {
        const src = 'data:audio/ogg;base64,AAAA';
        expect(getOptimizedAudioUrl(src)).toBe(src);
    });

    it('无 basePath 自动插入 compressed', () => {
        const url = getOptimizedAudioUrl('common/audio/dice/Dice_Roll_001.ogg');
        expect(url).toBe('/assets/common/audio/dice/compressed/Dice_Roll_001.ogg');
    });

    it('含 basePath 自动插入 compressed', () => {
        const url = getOptimizedAudioUrl('dice/Dice_Roll_001.ogg', 'common/audio');
        expect(url).toBe('/assets/common/audio/dice/compressed/Dice_Roll_001.ogg');
    });

    it('音频资源附加内容 hash 版本参数', () => {
        setAssetHashesForTesting({
            'common/audio/dice/compressed/Dice_Roll_001.ogg': '1122aabb',
        });
        const url = getOptimizedAudioUrl('common/audio/dice/Dice_Roll_001.ogg');
        expect(url).toBe('/assets/common/audio/dice/compressed/Dice_Roll_001.ogg?v=1122aabb');
    });

    it('可为音频单独指定远端基址而不影响图片基址', () => {
        setAssetsBaseUrl('/assets');
        setAudioAssetsBaseUrl('https://assets.easyboardgame.top/official');
        const url = getOptimizedAudioUrl('common/audio/dice/Dice_Roll_001.ogg');
        expect(url).toBe('https://assets.easyboardgame.top/official/common/audio/dice/compressed/Dice_Roll_001.ogg');
    });

    it('公共音频包存在时优先走本地 shared pack 基址', () => {
        setAudioAssetsBaseUrl('https://assets.easyboardgame.top/official');
        setCommonAudioAssetBaseOverride('/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/common-audio/current/assets');
        const url = getOptimizedAudioUrl('common/audio/dice/Dice_Roll_001.ogg');
        expect(url).toBe('/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/common-audio/current/assets/common/audio/dice/compressed/Dice_Roll_001.ogg');
    });

    it('游戏私有音频在已安装游戏包后优先走游戏本地包基址', () => {
        setAudioAssetsBaseUrl('https://assets.easyboardgame.top/official');
        setGameAssetBaseOverride('dicethrone', '/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/dicethrone/current/assets');
        const url = getOptimizedAudioUrl('audio/sfx/hero_entry.ogg', 'dicethrone');
        expect(url).toBe('/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/dicethrone/current/assets/dicethrone/audio/sfx/compressed/hero_entry.ogg');
    });
});
