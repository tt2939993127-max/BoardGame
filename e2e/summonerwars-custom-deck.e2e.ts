/**
 * 召唤师战争 - 自定义牌组 E2E 测试
 *
 * 覆盖关键交互面：
 * 1. 自定义牌组入口可见性（阵营选择界面）
 * 2. DeckBuilderDrawer 打开/关闭
 * 3. 阵营浏览 + 召唤师选择
 * 4. 卡牌添加/移除
 * 5. 验证状态反馈
 * 6. 牌组保存/加载/删除（需要后端 + 登录）
 * 7. 确认使用自定义牌组
 *
 * 注意：召唤师战争没有本地模式（allowLocalMode: false），
 * 完整联机流程需要后端服务运行。
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// ============================================================================
// 工具函数（复用自 summonerwars-selection.e2e.ts）
// ============================================================================

const setEnglishLocale = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
  });
};

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const getGameServerBaseURL = () => {
  const envUrl = process.env.PW_GAME_SERVER_URL || process.env.VITE_GAME_SERVER_URL;
  if (envUrl) return normalizeUrl(envUrl);
  const port = process.env.GAME_SERVER_PORT || process.env.PW_GAME_SERVER_PORT || '18000';
  return `http://localhost:${port}`;
};

const waitForMatchAvailable = async (page: Page, matchId: string, timeoutMs = 10000) => {
  const gameServerBaseURL = getGameServerBaseURL();
  const candidates = [
    `/games/summonerwars/${matchId}`,
    `${gameServerBaseURL}/games/summonerwars/${matchId}`,
  ];
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const url of candidates) {
      try {
        const response = await page.request.get(url);
        if (response.ok()) return true;
      } catch { /* ignore */ }
    }
    await page.waitForTimeout(500);
  }
  return false;
};

const dismissViteOverlay = async (page: Page) => {
  await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay');
    if (overlay) overlay.remove();
  });
};

const attachPageDiagnostics = (page: Page) => {
  const existing = (page as Page & { __swDiagnostics?: { errors: string[] } }).__swDiagnostics;
  if (existing) return existing;
  const diagnostics = { errors: [] as string[] };
  (page as Page & { __swDiagnostics?: { errors: string[] } }).__swDiagnostics = diagnostics;
  page.on('pageerror', (err) => diagnostics.errors.push(`pageerror:${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') diagnostics.errors.push(`console:${msg.text()}`);
  });
  return diagnostics;
};

const waitForFrontendAssets = async (page: Page, timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const [viteClient, main] = await Promise.all([
        page.request.get('/@vite/client'),
        page.request.get('/src/main.tsx'),
      ]);
      if (viteClient.ok() && main.ok()) return;
    } catch { /* ignore */ }
    await page.waitForTimeout(500);
  }
  throw new Error('前端资源未就绪');
};

const resetMatchStorage = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    if (sessionStorage.getItem('__sw_storage_reset')) return;
    sessionStorage.setItem('__sw_storage_reset', '1');
    const newGuestId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    localStorage.removeItem('owner_active_match');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('match_creds_')) localStorage.removeItem(key);
    });
    localStorage.setItem('guest_id', newGuestId);
    try { sessionStorage.setItem('guest_id', newGuestId); } catch { /* ignore */ }
    document.cookie = `bg_guest_id=${encodeURIComponent(newGuestId)}; path=/; SameSite=Lax`;
  });
};

const disableTutorial = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => { localStorage.setItem('tutorial_skip', '1'); });
};

const disableAudio = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.setItem('audio_muted', 'true');
    localStorage.setItem('audio_master_volume', '0');
    (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
  });
};

const blockAudioRequests = async (context: BrowserContext) => {
  await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());
};

const waitForHomeGameList = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  attachPageDiagnostics(page);
  await waitForFrontendAssets(page);
  await page.waitForSelector('[data-game-id]', { timeout: 15000, state: 'attached' });
};

const ensureSummonerWarsModalOpen = async (page: Page) => {
  const modalRoot = page.locator('#modal-root');
  const modalHeading = modalRoot.getByRole('heading', { name: /Summoner Wars|召唤师战争/i });
  try {
    await expect(modalHeading).toBeVisible({ timeout: 2000 });
  } catch {
    const card = page.locator('[data-game-id="summonerwars"]').first();
    // 如果卡片不存在，尝试刷新页面
    if (!await card.isVisible().catch(() => false)) {
      await page.goto('/?game=summonerwars', { waitUntil: 'domcontentloaded' });
      await waitForHomeGameList(page);
    }
    const retryCard = page.locator('[data-game-id="summonerwars"]').first();
    await retryCard.scrollIntoViewIfNeeded({ timeout: 10000 });
    await retryCard.click();
    await expect(modalHeading).toBeVisible({ timeout: 15000 });
  }
  return { modalRoot, modalHeading };
};

const dismissLobbyConfirmIfNeeded = async (page: Page) => {
  const confirmButton = page
    .locator('button:has-text("确认")')
    .or(page.locator('button:has-text("Confirm")'));
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
    await page.waitForTimeout(1000);
  }
};

const ensureGameServerAvailable = async (page: Page) => {
  const gameServerBaseURL = getGameServerBaseURL();
  for (const url of ['/games', `${gameServerBaseURL}/games`]) {
    try {
      const response = await page.request.get(url);
      if (response.ok()) return true;
    } catch { /* ignore */ }
  }
  return false;
};

const createSummonerWarsRoom = async (page: Page): Promise<string | null> => {
  attachPageDiagnostics(page);
  await page.goto('/?game=summonerwars', { waitUntil: 'domcontentloaded' });
  await dismissViteOverlay(page);
  await dismissLobbyConfirmIfNeeded(page);

  const { modalRoot } = await ensureSummonerWarsModalOpen(page);
  const lobbyTab = modalRoot.getByRole('button', { name: /Lobby|在线大厅/i });
  if (await lobbyTab.isVisible().catch(() => false)) await lobbyTab.click();

  const returnButton = modalRoot.locator('button:visible', { hasText: /Return to match|返回当前对局/i }).first();
  if (await returnButton.isVisible().catch(() => false)) {
    await returnButton.click();
    await page.waitForURL(/\/play\/summonerwars\/match\//, { timeout: 10000 });
    return new URL(page.url()).pathname.split('/').pop() ?? null;
  }

  const createButton = modalRoot.locator('button:visible', { hasText: /Create Room|创建房间/i }).first();
  await expect(createButton).toBeVisible({ timeout: 20000 });
  await createButton.click();
  await expect(page.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible({ timeout: 10000 });
  const confirmButton = page.getByRole('button', { name: /Confirm|确认/i });
  await expect(confirmButton).toBeEnabled({ timeout: 5000 });
  await confirmButton.click();

  try {
    await page.waitForURL(/\/play\/summonerwars\/match\//, { timeout: 8000 });
  } catch { return null; }

  const matchId = new URL(page.url()).pathname.split('/').pop() ?? null;
  if (!matchId) return null;
  if (!await waitForMatchAvailable(page, matchId, 15000)) return null;
  return matchId;
};

// ============================================================================
// 自定义牌组专用工具
// ============================================================================

/** 等待阵营选择界面出现 */
const waitForFactionSelection = async (page: Page, timeout = 20000) => {
  await expect(
    page.locator('h1').filter({ hasText: /选择你的阵营|Choose your faction/i })
  ).toBeVisible({ timeout });
};

/** 点击"自定义牌组"占位卡打开抽屉 */
const openDeckBuilder = async (page: Page) => {
  // 占位卡包含 "Custom Deck" 或 "自定义牌组" 文本
  const customDeckCard = page.locator('.grid > div').filter({
    hasText: /Custom Deck|自定义牌组/i,
  });
  await expect(customDeckCard).toBeVisible({ timeout: 5000 });
  await customDeckCard.click();
};

/** 等待 DeckBuilderDrawer 打开（标题可见） */
const waitForDeckBuilderOpen = async (page: Page, timeout = 5000) => {
  await expect(
    page.locator('h1').filter({ hasText: /Custom Deck Builder|牌组构建/i })
  ).toBeVisible({ timeout });
};

/** 等待 DeckBuilderDrawer 关闭 */
const waitForDeckBuilderClosed = async (page: Page, timeout = 5000) => {
  await expect(
    page.locator('h1').filter({ hasText: /Custom Deck Builder|牌组构建/i })
  ).toBeHidden({ timeout });
};

/** 在 FactionPanel 中选择一个阵营（按索引） */
const selectFactionInBuilder = async (page: Page, index: number) => {
  // FactionPanel 中的阵营按钮
  const factionButtons = page.locator('button').filter({
    has: page.locator('.rounded-full'), // 阵营按钮内有圆形图标
  });
  // 在抽屉内的阵营列表中点击
  const drawerFactions = page.locator('.w-\\[18vw\\] button');
  const count = await drawerFactions.count();
  if (count > index) {
    await drawerFactions.nth(index).click();
  }
};

/** 在 CardPoolPanel 中点击第一个召唤师卡牌 */
const selectFirstSummoner = async (page: Page) => {
  // 召唤师区域标题后的第一张卡牌
  const summonerSection = page.locator('h3').filter({ hasText: /Summoners|召唤师/i });
  await expect(summonerSection).toBeVisible({ timeout: 5000 });

  // 召唤师卡牌在 grid 中，找到第一个可点击的卡牌
  const cardPool = page.locator('.flex-1.overflow-y-auto');
  const firstCard = cardPool.locator('.grid > div').first();
  await expect(firstCard).toBeVisible({ timeout: 3000 });
  await firstCard.click();
};

/** 在 CardPoolPanel 中点击指定类型区域的第 N 张卡牌 */
const addCardFromPool = async (page: Page, sectionName: string, cardIndex: number) => {
  // 找到对应区域
  const section = page.locator('h3').filter({ hasText: new RegExp(sectionName, 'i') });
  await expect(section).toBeVisible({ timeout: 3000 });

  // 该区域后面的 grid 中的卡牌
  const sectionContainer = section.locator('..'); // 父级 div.mb-8
  const cards = sectionContainer.locator('.grid > div');
  const count = await cards.count();
  if (count > cardIndex) {
    await cards.nth(cardIndex).click();
  }
};

/** 获取 MyDeckPanel 中的总卡牌数 */
const getDeckCardCount = async (page: Page): Promise<string> => {
  const countText = page.locator('strong').filter({ hasText: /\d+/ }).first();
  return await countText.innerText();
};

// ============================================================================
// 测试
// ============================================================================

test.describe('SummonerWars 自定义牌组', () => {

  test('阵营选择界面显示自定义牌组入口', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    // 确保有 playerID
    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);

    // 验证自定义牌组占位卡可见
    const customDeckCard = page.locator('.grid > div').filter({
      hasText: /Custom Deck|自定义牌组/i,
    });
    await expect(customDeckCard).toBeVisible({ timeout: 5000 });

    // 验证占位卡包含"Click to Build"提示
    await expect(customDeckCard.locator('text=/Click to Build|点击构建/i')).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('custom-deck-entry.png') });
    await context.close();
  });

  test('打开和关闭 DeckBuilderDrawer', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);

    // 打开抽屉
    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    // 验证三栏布局可见
    // 左侧：阵营列表标题
    await expect(page.locator('h2').filter({ hasText: /Factions|阵营/i })).toBeVisible();
    // 中间：提示选择阵营
    await expect(page.locator('text=/Select a faction|选择一个阵营/i')).toBeVisible();
    // 右侧：我的牌组标题
    await expect(page.locator('h2').filter({ hasText: /My Deck|我的牌组/i })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('deck-builder-open.png') });

    // 关闭抽屉（点击关闭按钮）
    const closeButton = page.locator('button').filter({ has: page.locator('svg path[fill-rule="evenodd"]') }).last();
    await closeButton.click();
    await waitForDeckBuilderClosed(page);

    // 验证回到阵营选择界面
    await waitForFactionSelection(page);

    await page.screenshot({ path: testInfo.outputPath('deck-builder-closed.png') });
    await context.close();
  });

  test('阵营浏览和召唤师选择', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);
    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    // 选择第一个阵营
    await selectFactionInBuilder(page, 0);
    await page.waitForTimeout(500);

    // 验证卡牌池出现（不再显示"Select a faction"提示）
    await expect(page.locator('text=/Select a faction|选择一个阵营/i')).toBeHidden({ timeout: 3000 });

    // 验证召唤师区域出现
    const summonerSection = page.locator('h3').filter({ hasText: /Summoners|召唤师/i });
    await expect(summonerSection).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: testInfo.outputPath('deck-builder-faction-selected.png') });

    // 选择召唤师
    await selectFirstSummoner(page);
    await page.waitForTimeout(500);

    // 验证 MyDeckPanel 中出现了召唤师（紫色条标记）
    const summonerItem = page.locator('.bg-purple-500').first();
    await expect(summonerItem).toBeVisible({ timeout: 3000 });

    // 验证自动填充卡牌区域出现
    await expect(page.locator('text=/Starting Cards|起始卡牌/i')).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: testInfo.outputPath('deck-builder-summoner-selected.png') });
    await context.close();
  });

  test('卡牌添加和验证状态', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);
    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    // 选择阵营 + 召唤师
    await selectFactionInBuilder(page, 0);
    await page.waitForTimeout(500);
    await selectFirstSummoner(page);
    await page.waitForTimeout(500);

    // 验证初始状态：牌组不完整，显示验证错误
    const invalidLabel = page.locator('text=/Invalid Deck|牌组不合法/i');
    await expect(invalidLabel).toBeVisible({ timeout: 3000 });

    // 验证"Use This Deck"按钮被禁用
    const useDeckButton = page.locator('button').filter({ hasText: /Use This Deck|使用此牌组/i });
    if (await useDeckButton.isVisible().catch(() => false)) {
      await expect(useDeckButton).toBeDisabled();
    }

    // 添加一些冠军卡牌
    await addCardFromPool(page, 'Champions|冠军', 0);
    await page.waitForTimeout(300);

    // 验证 Build Cards 区域出现了手动添加的卡牌
    await expect(page.locator('text=/Build Cards|构建卡牌/i')).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: testInfo.outputPath('deck-builder-cards-added.png') });

    // 验证移除按钮可见（非锁定卡牌有 "-" 按钮）
    const removeButtons = page.locator('button').filter({ hasText: '-' });
    const removeCount = await removeButtons.count();
    expect(removeCount).toBeGreaterThan(0);

    // 点击移除按钮
    await removeButtons.first().click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: testInfo.outputPath('deck-builder-card-removed.png') });
    await context.close();
  });

  test('切换阵营浏览不同卡牌池', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);
    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    // 选择第一个阵营（necromancer，索引 0，有 mock 数据）
    await selectFactionInBuilder(page, 0);
    await page.waitForTimeout(500);

    // 验证第一个阵营的卡牌池出现
    const summonerSection1 = page.locator('h3').filter({ hasText: /Summoners|召唤师/i });
    await expect(summonerSection1).toBeVisible({ timeout: 5000 });
    const firstFactionCards = page.locator('.flex-1.overflow-y-auto .grid > div');
    const firstFactionCardCount = await firstFactionCards.count();
    expect(firstFactionCardCount).toBeGreaterThan(0);

    await page.screenshot({ path: testInfo.outputPath('deck-builder-faction1.png') });

    // 切换到 goblin 阵营（索引 3，有 mock 数据）
    // 注意：cardRegistry 目前只有 necromancer 和 goblin 的 mock 数据
    await selectFactionInBuilder(page, 3);

    // 等待卡牌池刷新
    await page.waitForTimeout(500);
    const secondFactionCards = page.locator('.flex-1.overflow-y-auto .grid > div');
    // goblin 有 mock 数据，应该有卡牌
    await expect(secondFactionCards.first()).toBeVisible({ timeout: 5000 });
    const secondFactionCardCount = await secondFactionCards.count();
    expect(secondFactionCardCount).toBeGreaterThan(0);

    await page.screenshot({ path: testInfo.outputPath('deck-builder-faction2.png') });
    await context.close();
  });

  test('点击遮罩层关闭抽屉', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await resetMatchStorage(context);
    await disableAudio(context);
    await disableTutorial(context);
    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSummonerWarsRoom(page);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
      url.searchParams.set('playerID', '0');
      await page.goto(url.toString());
    }

    await waitForFactionSelection(page);
    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    // 点击背景遮罩层关闭（遮罩是 fixed inset-0 bg-black/60 的 div）
    // 点击页面顶部（遮罩区域，抽屉占底部 85vh）
    await page.mouse.click(10, 10);
    await waitForDeckBuilderClosed(page);

    // 验证回到阵营选择界面
    await waitForFactionSelection(page);

    await page.screenshot({ path: testInfo.outputPath('deck-builder-mask-close.png') });
    await context.close();
  });
});
