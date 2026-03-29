/**
 * Vite 插件：为 public 根目录下的非 /assets 静态文件生成 content hash 映射。
 *
 * 目标目录：
 * - public/fonts
 * - public/logos
 * - public/game-data（可按文件排除动态配置）
 *
 * 运行时由 versionedPublicFileUrl 统一追加 ?v=<hash>，
 * index.html / src/fonts.css 在构建期直接改写，避免继续走短缓存。
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, relative } from 'path';
import type { Plugin } from 'vite';

const VERSION_PARAM = 'v';
const HASHED_PUBLIC_DIRS = ['fonts', 'logos', 'game-data'] as const;
const EXCLUDED_PUBLIC_FILES = new Set([
    'game-data/summonerwars.layout.json',
]);

const PUBLIC_FILE_RE = /\/(?:fonts|logos|game-data)\/[^"'`\s)]+/g;

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+/, '');

const shouldHashPublicFile = (relativePath: string) => {
    const normalized = normalizePath(relativePath);
    if (EXCLUDED_PUBLIC_FILES.has(normalized)) {
        return false;
    }
    return HASHED_PUBLIC_DIRS.some((dir) => normalized === dir || normalized.startsWith(`${dir}/`));
};

const scanPublicFileHashes = (publicDir: string): Record<string, string> => {
    const hashes: Record<string, string> = {};

    const walk = (dirPath: string) => {
        for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
            const fullPath = join(dirPath, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const rel = normalizePath(relative(publicDir, fullPath));
            if (!shouldHashPublicFile(rel)) {
                continue;
            }

            const content = readFileSync(fullPath);
            hashes[rel] = createHash('md5').update(content).digest('hex').slice(0, 8);
        }
    };

    for (const dir of HASHED_PUBLIC_DIRS) {
        const targetDir = join(publicDir, dir);
        if (!existsSync(targetDir)) {
            continue;
        }
        walk(targetDir);
    }

    return hashes;
};

const appendVersionToPublicUrl = (value: string, hashes: Record<string, string>) => {
    const hashIndex = value.indexOf('#');
    const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
    const queryIndex = withoutHash.indexOf('?');
    const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
    const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
    const normalized = normalizePath(path);

    if (!shouldHashPublicFile(normalized)) {
        return value;
    }

    const version = hashes[normalized];
    if (!version) {
        return value;
    }

    const params = new URLSearchParams(query);
    params.set(VERSION_PARAM, version);
    const nextQuery = params.toString();
    return nextQuery ? `${path}?${nextQuery}${hash}` : `${path}${hash}`;
};

export default function publicFileHashPlugin(): Plugin {
    let hashes: Record<string, string> = {};

    return {
        name: 'vite-public-file-hash',
        enforce: 'pre',
        config(_, { command }) {
            if (command === 'build') {
                const publicDir = join(process.cwd(), 'public');
                hashes = scanPublicFileHashes(publicDir);
                return {
                    define: {
                        __PUBLIC_FILE_HASHES__: JSON.stringify(hashes),
                    },
                };
            }

            hashes = {};
            return {
                define: {
                    __PUBLIC_FILE_HASHES__: JSON.stringify({}),
                },
            };
        },
        transform(code, id) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return null;
            }

            const [cleanId] = id.split('?');
            const normalizedId = cleanId.replace(/\\/g, '/');
            if (!normalizedId.endsWith('/src/fonts.css') && !normalizedId.endsWith('src/fonts.css')) {
                return null;
            }

            return code.replace(PUBLIC_FILE_RE, (matched) => appendVersionToPublicUrl(matched, hashes));
        },
        transformIndexHtml(html) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return html;
            }

            return html.replace(PUBLIC_FILE_RE, (matched) => appendVersionToPublicUrl(matched, hashes));
        },
        generateBundle(_, bundle) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return;
            }

            for (const output of Object.values(bundle)) {
                if (output.type !== 'asset' || !output.fileName.endsWith('.css')) {
                    continue;
                }

                const source = output.source;
                if (typeof source !== 'string') {
                    continue;
                }

                output.source = source.replace(PUBLIC_FILE_RE, (matched) => appendVersionToPublicUrl(matched, hashes));
            }
        },
    };
}
