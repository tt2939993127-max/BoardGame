import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getGamesByCategory,
    refreshUgcGames,
    shouldIncludeManifestInRegistry,
} from '../../config/games.config';

const createResponse = (data: unknown) => ({
    ok: true,
    headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => data,
});

describe('games.config manifest registry gate', () => {
    it('生产环境不应把内部 tool 清单暴露到首页注册表', () => {
        expect(shouldIncludeManifestInRegistry({
            id: 'archview',
            type: 'tool',
            enabled: true,
            titleKey: 'games.archview.title',
            descriptionKey: 'games.archview.description',
            category: 'tools',
            playersKey: 'games.archview.players',
            ai: {
                capture: false,
                localAi: false,
                remoteAi: false,
            },
            icon: '🏗️',
            mobileProfile: 'none',
            shellTargets: ['pwa'],
        }, {
            isNativeAndroidAppRuntime: false,
            isDev: false,
        })).toBe(false);
    });

    it('开发环境仍可保留 tool 清单入口', () => {
        expect(shouldIncludeManifestInRegistry({
            id: 'archview',
            type: 'tool',
            enabled: true,
            titleKey: 'games.archview.title',
            descriptionKey: 'games.archview.description',
            category: 'tools',
            playersKey: 'games.archview.players',
            ai: {
                capture: false,
                localAi: false,
                remoteAi: false,
            },
            icon: '🏗️',
            mobileProfile: 'none',
            shellTargets: ['pwa'],
        }, {
            isNativeAndroidAppRuntime: false,
            isDev: true,
        })).toBe(true);
    });
});

// UGC 功能暂时跳过测试
// 如需运行这些测试，请移除下面的 .skip
describe.skip('UGC 游戏清单接入', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(async () => {
        fetchMock.mockImplementation(() =>
            Promise.resolve(
                createResponse({
                    items: [],
                    page: 1,
                    limit: 20,
                    total: 0,
                    hasMore: false,
                })
            )
        );
        await refreshUgcGames();
        vi.unstubAllGlobals();
    });

    it('UGC 包只在全部分类中展示，并带 ugc 标签', async () => {
        const packageId = 'ugc-test-1';
        const coverAssetId = 'asset-cover-1';

        fetchMock.mockImplementation((url: string | URL) => {
            const requestUrl = String(url);
            if (requestUrl.includes(`/packages/${packageId}/manifest`)) {
                return Promise.resolve(
                    createResponse({
                        manifest: {
                            metadata: { playerOptions: [2, 4] },
                            assets: {
                                [coverAssetId]: {
                                    primaryVariantId: 'v1',
                                    variants: [
                                        {
                                            id: 'v1',
                                            format: 'webp',
                                            url: '/assets/ugc/cover.webp',
                                        },
                                    ],
                                },
                            },
                        },
                    })
                );
            }
            return Promise.resolve(
                createResponse({
                    items: [
                        {
                            packageId,
                            name: '测试 UGC 游戏',
                            description: '描述',
                            tags: ['strategy'],
                            coverAssetId,
                            status: 'published',
                        },
                    ],
                    page: 1,
                    limit: 20,
                    total: 1,
                    hasMore: false,
                })
            );
        });

        await refreshUgcGames();

        const allGames = getGamesByCategory('All');
        const casualGames = getGamesByCategory('casual');
        const ugcEntry = allGames.find((game) => game.id === packageId);

        expect(ugcEntry).toBeDefined();
        expect(ugcEntry?.tags).toContain('ugc');
        expect(casualGames.some((game) => game.id === packageId)).toBe(false);
    });
});
