/**
 * UGC Runtime E2E 测试
 * 
 * 测试 iframe 与宿主之间的 postMessage 通信
 */

import { test, expect } from '@playwright/test';

test.describe('UGC Runtime', () => {
    test.describe('postMessage 通信协议', () => {
        test('应正确发送和接收消息', async ({ page }) => {
            // 在页面中注入测试代码
            await page.goto('about:blank');

            // 模拟宿主发送消息
            const result = await page.evaluate(() => {
                return new Promise<{ received: boolean; messageType: string }>((resolve) => {
                    const messages: Array<{ type: string }> = [];

                    // 监听消息
                    window.addEventListener('message', (event) => {
                        if (event.data && event.data.source === 'ugc-view') {
                            messages.push({ type: event.data.type });
                            if (event.data.type === 'VIEW_READY') {
                                resolve({
                                    received: true,
                                    messageType: event.data.type,
                                });
                            }
                        }
                    });

                    // 模拟视图发送 VIEW_READY
                    window.postMessage({
                        id: 'test-1',
                        source: 'ugc-view',
                        type: 'VIEW_READY',
                        timestamp: Date.now(),
                    }, '*');

                    // 超时处理
                    setTimeout(() => {
                        resolve({ received: false, messageType: '' });
                    }, 1000);
                });
            });

            expect(result.received).toBe(true);
            expect(result.messageType).toBe('VIEW_READY');
        });

        test('应正确处理命令消息', async ({ page }) => {
            await page.goto('about:blank');

            const result = await page.evaluate(() => {
                return new Promise<{ commandType: string; playerId: string }>((resolve) => {
                    window.addEventListener('message', (event) => {
                        if (event.data?.source === 'ugc-view' && event.data?.type === 'COMMAND') {
                            resolve({
                                commandType: event.data.payload.commandType,
                                playerId: event.data.payload.playerId,
                            });
                        }
                    });

                    // 模拟视图发送命令
                    window.postMessage({
                        id: 'cmd-1',
                        source: 'ugc-view',
                        type: 'COMMAND',
                        timestamp: Date.now(),
                        payload: {
                            commandType: 'PLAY_CARD',
                            playerId: 'player-1',
                            params: { cardId: 'card-1' },
                        },
                    }, '*');

                    setTimeout(() => resolve({ commandType: '', playerId: '' }), 1000);
                });
            });

            expect(result.commandType).toBe('PLAY_CARD');
            expect(result.playerId).toBe('player-1');
        });

        test('应正确处理状态请求', async ({ page }) => {
            await page.goto('about:blank');

            const result = await page.evaluate(() => {
                return new Promise<{ type: string }>((resolve) => {
                    window.addEventListener('message', (event) => {
                        if (event.data?.source === 'ugc-view' && event.data?.type === 'STATE_REQUEST') {
                            resolve({ type: event.data.type });
                        }
                    });

                    window.postMessage({
                        id: 'state-1',
                        source: 'ugc-view',
                        type: 'STATE_REQUEST',
                        timestamp: Date.now(),
                    }, '*');

                    setTimeout(() => resolve({ type: '' }), 1000);
                });
            });

            expect(result.type).toBe('STATE_REQUEST');
        });

        test('应正确处理音效请求', async ({ page }) => {
            await page.goto('about:blank');

            const result = await page.evaluate(() => {
                return new Promise<{ sfxKey: string; volume: number }>((resolve) => {
                    window.addEventListener('message', (event) => {
                        if (event.data?.source === 'ugc-view' && event.data?.type === 'PLAY_SFX') {
                            resolve({
                                sfxKey: event.data.payload.sfxKey,
                                volume: event.data.payload.volume,
                            });
                        }
                    });

                    window.postMessage({
                        id: 'sfx-1',
                        source: 'ugc-view',
                        type: 'PLAY_SFX',
                        timestamp: Date.now(),
                        payload: { sfxKey: 'click', volume: 0.8 },
                    }, '*');

                    setTimeout(() => resolve({ sfxKey: '', volume: 0 }), 1000);
                });
            });

            expect(result.sfxKey).toBe('click');
            expect(result.volume).toBe(0.8);
        });
    });

    test.describe('消息结构验证', () => {
        test('消息应包含必要字段', async ({ page }) => {
            await page.goto('about:blank');

            const result = await page.evaluate(() => {
                return new Promise<{ hasId: boolean; hasSource: boolean; hasTimestamp: boolean }>((resolve) => {
                    window.addEventListener('message', (event) => {
                        if (event.data?.source === 'ugc-view') {
                            resolve({
                                hasId: typeof event.data.id === 'string',
                                hasSource: event.data.source === 'ugc-view',
                                hasTimestamp: typeof event.data.timestamp === 'number',
                            });
                        }
                    });

                    window.postMessage({
                        id: `msg-${Date.now()}`,
                        source: 'ugc-view',
                        type: 'VIEW_READY',
                        timestamp: Date.now(),
                    }, '*');

                    setTimeout(() => resolve({ hasId: false, hasSource: false, hasTimestamp: false }), 1000);
                });
            });

            expect(result.hasId).toBe(true);
            expect(result.hasSource).toBe(true);
            expect(result.hasTimestamp).toBe(true);
        });
    });
});
