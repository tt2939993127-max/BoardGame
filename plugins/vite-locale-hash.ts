/**
 * Vite 插件：为 public/locales/ 下的 JSON 文件生成 content hash 映射
 * 
 * 构建时扫描所有 locale JSON，计算短 hash，注入全局变量 __LOCALE_HASHES__。
 * i18n 加载时带上 ?v=<hash> 参数，内容不变则 hash 不变（CDN/浏览器继续缓存），
 * 内容变了 hash 自动变（缓存自动失效）。
 * 
 * 开发模式下返回空映射（Vite dev server 不缓存）。
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type { Plugin } from 'vite';

function scanLocaleHashes(localesDir: string): Record<string, string> {
    const hashes: Record<string, string> = {};

    function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.json')) {
                const rel = relative(localesDir, fullPath).replace(/\\/g, '/');
                const content = readFileSync(fullPath);
                const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
                hashes[rel] = hash;
            }
        }
    }

    walk(localesDir);
    return hashes;
}

export default function localeHashPlugin(): Plugin {
    return {
        name: 'vite-locale-hash',
        config(_, { command }) {
            if (command === 'build') {
                const localesDir = join(process.cwd(), 'public', 'locales');
                const hashes = scanLocaleHashes(localesDir);
                return {
                    define: {
                        __LOCALE_HASHES__: JSON.stringify(hashes),
                    },
                };
            }
            // 开发模式不需要 hash（Vite dev server 不缓存静态文件）
            return {
                define: {
                    __LOCALE_HASHES__: JSON.stringify({}),
                },
            };
        },
    };
}
