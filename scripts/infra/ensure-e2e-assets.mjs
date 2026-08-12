import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const normalize = (value) => String(value || '').trim().replace(/\\/g, '/');

export const resolveE2EAssetGameIds = (targetPath, env = process.env) => {
    const explicit = String(env.PW_ASSET_GAME_IDS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    if (explicit.length > 0) return [...new Set(explicit)];

    const normalizedTarget = normalize(targetPath);
    const match = normalizedTarget.match(/(?:^|\/)e2e\/([^/]+)(?:\/|$)/i);
    if (!match) return [];
    const candidate = match[1];
    if (candidate.startsWith('_') || candidate === 'helpers' || candidate === 'fixtures') return [];
    return existsSync(path.join(process.cwd(), 'src', 'games', candidate)) ? [candidate] : [];
};

export const ensureE2EAssets = ({ targetPath, env = process.env, runner = process.execPath } = {}) => {
    const gameIds = resolveE2EAssetGameIds(targetPath, env);
    if (gameIds.length === 0 || env.PW_E2E_LIST_ONLY === 'true' || env.PW_SKIP_ASSET_BOOTSTRAP === 'true') {
        return { gameIds, skipped: true };
    }

    const args = ['scripts/assets/download-from-server.js'];
    for (const gameId of gameIds) args.push('--game', gameId);
    console.log(`🧩 E2E 自动准备素材：${gameIds.join(', ')}`);
    const result = spawnSync(runner, args, {
        cwd: process.cwd(),
        env,
        stdio: 'inherit',
        shell: false,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`E2E 素材准备失败: gameIds=${gameIds.join(',')}`);
    return { gameIds, skipped: false };
};

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
    const targetPath = process.argv[2] || process.env.PW_TEST_TARGET || '';
    ensureE2EAssets({ targetPath });
}
