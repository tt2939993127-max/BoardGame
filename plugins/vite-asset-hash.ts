/**
 * Vite 插件：为 public/assets/ 下的静态资源生成 content hash 映射
 *
 * 构建时扫描资源目录，注入全局常量 __ASSET_HASHES__。
 * 运行时资源 URL 统一追加 ?v=<hash>，实现“长缓存 + 内容变更自动失效”。
 *
 * 开发模式返回空映射，避免影响本地调试。
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type { Plugin } from 'vite';

function scanAssetHashes(assetsDir: string): Record<string, string> {
    const hashes: Record<string, string> = {};

    function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const rel = relative(assetsDir, fullPath).replace(/\\/g, '/');
            const content = readFileSync(fullPath);
            const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
            hashes[rel] = hash;
        }
    }

    walk(assetsDir);
    return hashes;
}

export default function assetHashPlugin(): Plugin {
    return {
        name: 'vite-asset-hash',
        config(_, { command }) {
            if (command === 'build') {
                const assetsDir = join(process.cwd(), 'public', 'assets');
                const hashes = scanAssetHashes(assetsDir);
                return {
                    define: {
                        __ASSET_HASHES__: JSON.stringify(hashes),
                    },
                };
            }

            return {
                define: {
                    __ASSET_HASHES__: JSON.stringify({}),
                },
            };
        },
    };
}
