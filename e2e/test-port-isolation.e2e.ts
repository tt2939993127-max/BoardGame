/**
 * 端口隔离验证测试
 * 
 * 验证 E2E 测试环境使用正确的端口（19000/19001），不与开发环境冲突
 */

import { test, expect } from '@playwright/test';
import { getGameServerBaseURL } from './helpers/common';

test.describe('端口隔离验证', () => {
    test('应该使用测试环境端口 19000', async () => {
        const gameServerUrl = getGameServerBaseURL();
        console.log('Game Server URL:', gameServerUrl);
        
        // 验证使用的是测试环境端口
        expect(gameServerUrl).toContain('19000');
        expect(gameServerUrl).not.toContain('18000');
    });

    test('应该能够访问测试环境的游戏服务器', async ({ page }) => {
        const gameServerUrl = getGameServerBaseURL();
        
        // 尝试访问游戏服务器的健康检查端点
        const response = await page.request.post(`${gameServerUrl}/games/smashup/create`, {
            data: { 
                numPlayers: 2, 
                setupData: { 
                    guestId: `test_${Date.now()}`,
                    ownerKey: `guest:test_${Date.now()}`,
                    ownerType: 'guest'
                } 
            },
        });
        
        console.log('Response status:', response.status());
        console.log('Response URL:', response.url());
        
        // 验证服务器可访问（201 Created 或 200 OK）
        expect(response.ok() || response.status() === 201).toBeTruthy();
    });
});
