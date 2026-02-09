import { test, expect, type BrowserContext, type FrameLocator, type Page } from '@playwright/test';

const PACKAGE_ID = 'doudizhu-preview';
const GAME_NAME = /斗地主预览/i;

const setEnglishLocale = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
  });
};

const disableTutorial = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.setItem('tutorial_skip', '1');
  });
};

const disableAudio = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.setItem('audio_muted', 'true');
    localStorage.setItem('audio_master_volume', '0');
    (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
  });
};

const resetMatchIdentity = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    localStorage.removeItem('owner_active_match');
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('match_creds_')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem('guest_id');
    const guestId = `${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
    localStorage.setItem('guest_id', guestId);
    document.cookie = `bg_guest_id=${encodeURIComponent(guestId)}; path=/; SameSite=Lax`;
  });
};

const blockAudioRequests = async (context: BrowserContext) => {
  await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());
};

const dismissViteOverlay = async (page: Page) => {
  await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay');
    if (overlay) overlay.remove();
  });
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

const waitForHomeGameList = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('[data-game-id]', { timeout: 15000, state: 'attached' });
};

const ensureGameServerAvailable = async (page: Page) => {
  const gameServerBaseURL = process.env.PW_GAME_SERVER_URL || process.env.VITE_GAME_SERVER_URL || 'http://localhost:18000';
  const candidates = ['/games', `${gameServerBaseURL}/games`];
  for (const url of candidates) {
    try {
      const response = await page.request.get(url);
      if (response.ok()) return true;
    } catch {
      // ignore
    }
  }
  return false;
};

type RuntimeState = {
  phase?: string;
  activePlayerId?: string;
  publicZones?: Record<string, unknown>;
  gameOver?: { winner?: string };
};

const getHandCardId = (state: RuntimeState | null, playerId: string) => {
  const zones = state?.publicZones as Record<string, unknown> | undefined;
  const hands = zones?.hands as Record<string, Array<{ id?: string } | string>> | undefined;
  const hand = hands?.[playerId];
  const firstCard = hand?.[0];
  if (!firstCard) return null;
  if (typeof firstCard === 'string') return firstCard;
  if (typeof firstCard.id === 'string') return firstCard.id;
  return null;
};

const requestRuntimeState = async (frame: FrameLocator) => frame.locator('body').evaluate(async () => {
  return new Promise<RuntimeState | null>((resolve) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; payload?: { state?: RuntimeState } } | undefined;
      if (data?.source !== 'ugc-host' || data.type !== 'STATE_UPDATE') return;
      window.removeEventListener('message', handler);
      resolve(data.payload?.state ?? null);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({
      id: `state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'ugc-view',
      type: 'STATE_REQUEST',
      timestamp: Date.now(),
    }, '*');
    window.setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 1500);
  });
});

const sendRuntimeCommand = async (
  frame: FrameLocator,
  commandType: string,
  playerId: string,
  params: Record<string, unknown> = {},
) => {
  await frame.locator('body').evaluate((_, { commandType, playerId, params }) => {
    window.parent.postMessage({
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'ugc-view',
      type: 'COMMAND',
      timestamp: Date.now(),
      payload: {
        commandType,
        playerId,
        params,
      },
    }, '*');
  }, { commandType, playerId, params });
};

const waitForActivePlayer = async (frame: FrameLocator, playerId: string) => {
  await expect.poll(async () => (await requestRuntimeState(frame))?.activePlayerId).toBe(playerId);
};

test.describe('UGC 斗地主预览流程', () => {
  test('大厅可见并能进入 UGC 对局（截图）', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const context = await browser.newContext({ baseURL });
    await blockAudioRequests(context);
    await setEnglishLocale(context);
    await disableAudio(context);
    await disableTutorial(context);
    await resetMatchIdentity(context);

    const page = await context.newPage();

    if (!await ensureGameServerAvailable(page)) {
      test.skip(true, 'Game server unavailable');
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
    await dismissLobbyConfirmIfNeeded(page);
    await waitForHomeGameList(page);

    const ugcCard = page.locator(`[data-game-id="${PACKAGE_ID}"]`).first();
    await expect(ugcCard).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: 'screenshots/ugc-preview-lobby.png', fullPage: true });

    await ugcCard.click();
    await expect(page).toHaveURL(/game=doudizhu-preview/);

    const modalRoot = page.locator('#modal-root');
    await expect(modalRoot.getByRole('heading', { name: GAME_NAME })).toBeVisible({ timeout: 15000 });

    const lobbyTab = modalRoot.getByRole('button', { name: /Lobby|在线大厅/i });
    if (await lobbyTab.isVisible().catch(() => false)) {
      await lobbyTab.click();
    }

    const createButton = modalRoot.locator('button:visible', { hasText: /Create Room|创建房间/i }).first();
    await expect(createButton).toBeVisible({ timeout: 20000 });
    await createButton.click();

    await expect(page.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible({ timeout: 10000 });
    const confirmButton = page.getByRole('button', { name: /Confirm|确认/i });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();

    await page.waitForURL(/\/play\/doudizhu-preview\/match\//, { timeout: 15000 });

    const iframe = page.locator(`iframe[title="UGC Remote Host ${PACKAGE_ID}"]`);
    await expect(iframe).toBeVisible({ timeout: 20000 });

    const previewCanvas = page
      .frameLocator(`iframe[title="UGC Remote Host ${PACKAGE_ID}"]`)
      .locator('[data-testid="ugc-preview-canvas"]');
    await expect(previewCanvas).toBeVisible({ timeout: 20000 });

    const frame = page.frameLocator(`iframe[title="UGC Remote Host ${PACKAGE_ID}"]`);
    const handArea = frame.locator('[data-component-id="hand-bottom"] [data-hand-area="root"]');
    const playZone = frame.locator('[data-component-id="play-zone"] [data-hand-area="root"]');
    const actionBar = frame.locator('[data-component="action-bar"]');
    const bidButton = actionBar.getByRole('button', { name: '叫分' });
    const callLandlordButton = actionBar.getByRole('button', { name: '抢地主' });
    const passButton = actionBar.getByRole('button', { name: '不出' });
    await expect(handArea).toBeVisible({ timeout: 20000 });
    await expect(playZone).toBeVisible({ timeout: 20000 });
    await expect(bidButton).toBeVisible({ timeout: 10000 });
    await expect(callLandlordButton).toBeVisible({ timeout: 10000 });
    await expect(passButton).toBeVisible({ timeout: 10000 });

    const initialHandCount = Number(await handArea.getAttribute('data-card-count') || 0);
    const initialPlayCount = Number(await playZone.getAttribute('data-card-count') || 0);
    await expect(initialHandCount).toBeGreaterThan(0);
    const bidState = await requestRuntimeState(frame);
    expect(bidState?.phase).toBe('bid');
    expect(bidState?.activePlayerId).toBe('player-1');

    await bidButton.click();
    await waitForActivePlayer(frame, 'player-2');
    const afterBidState = await requestRuntimeState(frame);
    const afterBidZones = afterBidState?.publicZones as Record<string, unknown> | undefined;
    expect(afterBidState?.phase).toBe('bid');
    expect(afterBidZones?.highestBid).toBe(1);

    await sendRuntimeCommand(frame, 'CALL_LANDLORD', 'player-2');
    await expect.poll(async () => (await requestRuntimeState(frame))?.phase).toBe('action');
    const actionState = await requestRuntimeState(frame);
    const actionZones = actionState?.publicZones as Record<string, unknown> | undefined;
    const landlordId = String(actionZones?.landlordId || 'player-2');
    expect(landlordId).toBe('player-2');

    for (let i = 0; i < 25; i += 1) {
      await waitForActivePlayer(frame, landlordId);
      let loopState = await requestRuntimeState(frame);
      if (loopState?.gameOver?.winner) break;

      const cardId = getHandCardId(loopState, landlordId);
      if (!cardId) break;

      await sendRuntimeCommand(frame, 'PLAY_CARD', landlordId, { cardIds: [cardId] });
      loopState = await requestRuntimeState(frame);
      if (loopState?.gameOver?.winner) break;

      await waitForActivePlayer(frame, 'player-3');
      await sendRuntimeCommand(frame, 'PASS', 'player-3');
      loopState = await requestRuntimeState(frame);
      if (loopState?.gameOver?.winner) break;

      await waitForActivePlayer(frame, 'player-1');
      await sendRuntimeCommand(frame, 'PASS', 'player-1');
    }

    const finalState = await requestRuntimeState(frame);
    expect(finalState?.gameOver?.winner).toBe(landlordId);

    await page.screenshot({ path: 'screenshots/ugc-preview-match.png', fullPage: true });

    await context.close();
  });
});
