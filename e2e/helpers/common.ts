/**
 * E2E 测试通用工具函数
 *
 * 所有游戏共享的浏览器上下文初始化、服务器检测、页面诊断等。
 * 各游戏专用工具放在对应的 helpers/<gameId>.ts 中。
 */

import { type BrowserContext, type Page } from '@playwright/test';

// ============================================================================
// 浏览器上下文初始化（注入 localStorage / 拦截请求）
// ============================================================================

/** 设置英文 locale */
export const setEnglishLocale = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
    });
};

/** 跳过教学引导 */
export const disableTutorial = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('tutorial_skip', '1');
    });
};

/** 禁用音频（localStorage + 全局标记） */
export const disableAudio = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('audio_muted', 'true');
        localStorage.setItem('audio_master_volume', '0');
        localStorage.setItem('audio_sfx_volume', '0');
        localStorage.setItem('audio_bgm_volume', '0');
        (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
    });
};

/** 拦截所有音频文件请求（减少网络开销） */
export const blockAudioRequests = async (context: BrowserContext) => {
    await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, (route) => route.abort());
};

/**
 * 重置客户端对局凭证，生成新的 guestId。
 * storageKey 用于防止同一页面重复执行（不同游戏用不同 key）。
 */
export const resetMatchStorage = async (
    context: BrowserContext | Page,
    storageKey = '__storage_reset',
) => {
    await context.addInitScript((key) => {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        const newGuestId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        localStorage.removeItem('owner_active_match');
        Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('match_creds_')) localStorage.removeItem(k);
        });
        localStorage.setItem('guest_id', newGuestId);
        try {
            sessionStorage.setItem('guest_id', newGuestId);
        } catch {
            /* ignore */
        }
        document.cookie = `bg_guest_id=${encodeURIComponent(newGuestId)}; path=/; SameSite=Lax`;
    }, storageKey);
};

/** 生成带前缀的唯一 guestId */
export const createGuestId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// ============================================================================
// 服务器检测
// ============================================================================

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

/** 获取游戏服务器 baseURL（优先环境变量） */
export const getGameServerBaseURL = () => {
    const envUrl = process.env.PW_GAME_SERVER_URL || process.env.VITE_GAME_SERVER_URL;
    if (envUrl) return normalizeUrl(envUrl);
    const port =
        process.env.GAME_SERVER_PORT || process.env.PW_GAME_SERVER_PORT || '18000';
    return `http://localhost:${port}`;
};

/** 检查游戏服务器是否可用 */
export const ensureGameServerAvailable = async (page: Page) => {
    const gameServerBaseURL = getGameServerBaseURL();
    const candidates = ['/games', `${gameServerBaseURL}/games`];
    for (const url of candidates) {
        try {
            const response = await page.request.get(url);
            if (response.ok()) return true;
        } catch {
            /* ignore */
        }
    }
    return false;
};

/**
 * 轮询等待指定对局在服务端可查询到。
 * gameName 为 boardgame.io 注册的游戏名（如 'dicethrone'、'summonerwars'）。
 */
export const waitForMatchAvailable = async (
    page: Page,
    gameName: string,
    matchId: string,
    timeoutMs = 15000,
) => {
    const gameServerBaseURL = getGameServerBaseURL();
    const candidates = [
        `/games/${gameName}/${matchId}`,
        `${gameServerBaseURL}/games/${gameName}/${matchId}`,
    ];
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        for (const url of candidates) {
            try {
                const response = await page.request.get(url);
                if (response.ok()) return true;
            } catch {
                /* ignore */
            }
        }
        await page.waitForTimeout(500);
    }
    return false;
};

// ============================================================================
// 页面诊断
// ============================================================================

/** 移除 Vite 错误覆盖层 */
export const dismissViteOverlay = async (page: Page) => {
    await page.evaluate(() => {
        const overlay = document.querySelector('vite-error-overlay');
        if (overlay) overlay.remove();
    });
};

/** 挂载页面错误收集器（pageerror + console.error） */
export const attachPageDiagnostics = (page: Page) => {
    const existing = (page as Page & { __e2eDiagnostics?: { errors: string[] } })
        .__e2eDiagnostics;
    if (existing) return existing;
    const diagnostics = { errors: [] as string[] };
    (page as Page & { __e2eDiagnostics?: { errors: string[] } }).__e2eDiagnostics =
        diagnostics;
    page.on('pageerror', (err) =>
        diagnostics.errors.push(`pageerror:${err.message}`),
    );
    page.on('console', (msg) => {
        if (msg.type() === 'error')
            diagnostics.errors.push(`console:${msg.text()}`);
    });
    return diagnostics;
};

/** 等待 Vite 前端资源就绪 */
export const waitForFrontendAssets = async (page: Page, timeoutMs = 30000) => {
    const start = Date.now();
    let lastStatus = 'unknown';
    while (Date.now() - start < timeoutMs) {
        try {
            const [viteClient, main] = await Promise.all([
                page.request.get('/@vite/client'),
                page.request.get('/src/main.tsx'),
            ]);
            lastStatus = `vite=${viteClient.status()} main=${main.status()}`;
            if (viteClient.ok() && main.ok()) return;
        } catch (err) {
            lastStatus = `error:${String(err)}`;
        }
        await page.waitForTimeout(500);
    }
    throw new Error(`前端资源未就绪: ${lastStatus}`);
};

/** 等待首页游戏列表渲染 */
export const waitForHomeGameList = async (page: Page, timeoutMs = 30000) => {
    await page.waitForLoadState('domcontentloaded');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            await page.waitForSelector('[data-game-id]', {
                timeout: 5000,
                state: 'attached',
            });
            return;
        } catch {
            await page.waitForTimeout(1000);
        }
    }
    throw new Error('等待游戏列表超时');
};

/** 关闭大厅确认弹窗（如果存在） */
export const dismissLobbyConfirmIfNeeded = async (page: Page) => {
    const confirmButton = page
        .locator('button:has-text("确认")')
        .or(page.locator('button:has-text("Confirm")'));
    if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
    }
};

/**
 * 向服务端 join 对局并返回 credentials。
 * gameName 为 boardgame.io 注册的游戏名。
 */
export const joinMatchViaAPI = async (
    page: Page,
    gameName: string,
    matchId: string,
    playerId: string,
    playerName: string,
    guestId?: string,
) => {
    const gameServerBaseURL = getGameServerBaseURL();
    const url = `${gameServerBaseURL}/games/${gameName}/${matchId}/join`;
    const response = await page.request.post(url, {
        data: {
            playerID: playerId,
            playerName,
            ...(guestId ? { data: { guestId } } : {}),
        },
    });
    if (!response.ok()) return null;
    const data = (await response.json().catch(() => null)) as {
        playerCredentials?: string;
    } | null;
    return data?.playerCredentials ?? null;
};

/**
 * 将对局凭证写入 localStorage（通过 addInitScript 在页面加载前注入）。
 */
export const seedMatchCredentials = async (
    context: BrowserContext | Page,
    gameName: string,
    matchId: string,
    playerId: string,
    credentials: string,
) => {
    await context.addInitScript(
        ({ gameName, matchId, playerId, credentials }) => {
            const payload = {
                matchID: matchId,
                playerID: playerId,
                credentials,
                gameName,
                updatedAt: Date.now(),
            };
            localStorage.setItem(
                `match_creds_${matchId}`,
                JSON.stringify(payload),
            );
            window.dispatchEvent(new Event('match-credentials-changed'));
        },
        { gameName, matchId, playerId, credentials },
    );
};

// ============================================================================
// 通用上下文初始化（一次性设置所有常用选项）
// ============================================================================

/** 对 BrowserContext 执行标准初始化（英文 locale + 禁音 + 拦截音频 + 跳过教学 + 重置凭证） */
export const initContext = async (
    context: BrowserContext,
    opts?: { storageKey?: string; skipTutorial?: boolean },
) => {
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context, opts?.storageKey);
    if (opts?.skipTutorial !== false) await disableTutorial(context);
    await disableAudio(context);
};
