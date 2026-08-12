import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureE2EAssets, resolveE2EAssetGameIds } from './ensure-e2e-assets.mjs';

test('明确 e2e/<gameId> 目标自动识别游戏，公共目录不扩大范围', () => {
    assert.deepEqual(
        resolveE2EAssetGameIds('e2e/smashup/smashup-alien-card-images.e2e.ts'),
        ['smashup'],
    );
    assert.deepEqual(resolveE2EAssetGameIds('e2e/_shared/ugc-preview.e2e.ts'), []);
    assert.deepEqual(resolveE2EAssetGameIds('e2e/lobby.e2e.ts'), []);
});

test('显式 PW_ASSET_GAME_IDS 覆盖文件路径推断', () => {
    assert.deepEqual(
        resolveE2EAssetGameIds('e2e/lobby.e2e.ts', { PW_ASSET_GAME_IDS: 'smashup, dicethrone,smashup' }),
        ['smashup', 'dicethrone'],
    );
});

test('--list 和显式跳过开关不会启动下载子进程', () => {
    let spawnCalled = false;
    const runner = () => {
        spawnCalled = true;
        throw new Error('不应下载');
    };

    const listResult = ensureE2EAssets({
        targetPath: 'e2e/smashup/smashup-flow.e2e.ts',
        env: { PW_E2E_LIST_ONLY: 'true' },
        runner,
    });
    assert.deepEqual(listResult, { gameIds: ['smashup'], skipped: true });

    const skippedResult = ensureE2EAssets({
        targetPath: 'e2e/smashup/smashup-flow.e2e.ts',
        env: { PW_SKIP_ASSET_BOOTSTRAP: 'true' },
        runner,
    });
    assert.deepEqual(skippedResult, { gameIds: ['smashup'], skipped: true });
    assert.equal(spawnCalled, false);
});
