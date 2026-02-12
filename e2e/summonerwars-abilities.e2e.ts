/**
 * 鍙敜甯堟垬浜?- 鐗规畩鎶€鑳戒氦浜?E2E 娴嬭瘯
 * 
 * 瑕嗙洊闇€瑕?UI 浜や簰鐨勭壒娈婃妧鑳斤細
 * - 鐏甸瓊杞Щ锛堝嚮鏉€鍚庣灛绉荤‘璁わ級
 * - 蹇冪伒鎹曡幏锛堟敾鍑诲悗鎺у埗/浼ゅ閫夋嫨锛?
 * - 蹇靛姏/楂橀樁蹇靛姏锛堟敾鍑诲悗鎺ㄦ媺鏂瑰悜閫夋嫨锛?
 * - 璇诲績浼犲康锛堟敾鍑诲悗閫夋嫨鍙嬫柟澹叺棰濆鏀诲嚮锛?
 * - 鎰熸煋锛堝嚮鏉€鍚庝粠寮冪墝鍫嗛€夋嫨鐤梾浣擄級
 * - 鎶撻檮璺熼殢锛堝弸鏂圭Щ鍔ㄥ悗閫夋嫨璺熼殢浣嶇疆锛?
 * - 鍚稿彇鐢熷懡锛堟敾鍑诲墠鐗虹壊鍙嬫柟鍗曚綅锛?
 * - 鍦ｅ厜绠紙鏀诲嚮鍓嶅純鐗屽姞鎴愶級
 * - 娌荤枟锛堟敾鍑诲墠寮冪墝骞堕€夋嫨鍙嬫柟娌荤枟鐩爣锛?
 * 
 * 娉ㄦ剰锛氭敾鍑绘秹鍙婇瀛愰殢鏈猴紝閮ㄥ垎娴嬭瘯浣跨敤杞柇瑷€
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createDeckByFactionId } from '../src/games/summonerwars/config/factions';
import { BOARD_COLS, BOARD_ROWS, HAND_SIZE } from '../src/games/summonerwars/domain/helpers';

// ============================================================================
// 閫氱敤杈呭姪鍑芥暟锛堜笌 summonerwars.e2e.ts 淇濇寔涓€鑷达級
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

const matchOwnerGuestIds = new Map<string, string>();

const createGuestId = (prefix: string) => (
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
);

const seedMatchCredentials = async (
  page: Page,
  payload: { matchId: string; playerId: string; credentials: string; guestId: string; playerName: string }
) => {
  await page.addInitScript(({ matchId, playerId, credentials, guestId, playerName }) => {
    localStorage.setItem('guest_id', guestId);
    try { sessionStorage.setItem('guest_id', guestId); } catch { /* ignore */ }
    sessionStorage.setItem('__sw_storage_reset', '1');
    localStorage.setItem(
      `match_creds_${matchId}`,
      JSON.stringify({ matchID: matchId, gameName: 'summonerwars', playerID: playerId, credentials, playerName })
    );
    document.cookie = `bg_guest_id=${encodeURIComponent(guestId)}; path=/; SameSite=Lax`;
  }, payload);
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
  page.on('console', (msg) => { if (msg.type() === 'error') diagnostics.errors.push(`console:${msg.text()}`); });
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
  throw new Error('鍓嶇璧勬簮鏈氨缁?);
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
    localStorage.setItem('audio_sfx_volume', '0');
    localStorage.setItem('audio_bgm_volume', '0');
    (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
  });
};

const enableE2EDebug = async (context: BrowserContext | Page) => {
  await context.addInitScript(() => {
    (window as Window & { __BG_E2E_DEBUG__?: boolean }).__BG_E2E_DEBUG__ = true;
  });
};

const blockAudioRequests = async (context: BrowserContext) => {
  await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());
};

const dismissLobbyConfirmIfNeeded = async (page: Page) => {
  const confirmButton = page.locator('button:has-text("纭")').or(page.locator('button:has-text("Confirm")'));
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
    await page.waitForTimeout(1000);
  }
};

const waitForHomeGameList = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  attachPageDiagnostics(page);
  await waitForFrontendAssets(page);
  await page.waitForSelector('[data-game-id]', { timeout: 12000, state: 'attached' });
};

const ensureSummonerWarsCard = async (page: Page) => {
  await waitForHomeGameList(page);
  let card = page.locator('[data-game-id="summonerwars"]');
  if (await card.count() === 0) {
    const strategyTab = page.getByRole('button', { name: /Strategy|绛栫暐/i });
    if (await strategyTab.isVisible().catch(() => false)) await strategyTab.click();
    card = page.locator('[data-game-id="summonerwars"]');
  }
  await expect(card).toHaveCount(1, { timeout: 15000 });
  await card.first().scrollIntoViewIfNeeded();
  return card.first();
};

const ensureSummonerWarsModalOpen = async (page: Page) => {
  const modalRoot = page.locator('#modal-root');
  const modalHeading = modalRoot.getByRole('heading', { name: /Summoner Wars|鍙敜甯堟垬浜?i });
  try {
    await expect(modalHeading).toBeVisible({ timeout: 2000 });
  } catch {
    const gameCard = await ensureSummonerWarsCard(page);
    await gameCard.click();
    await expect(modalHeading).toBeVisible({ timeout: 15000 });
  }
  return { modalRoot, modalHeading };
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

const joinSummonerWarsMatch = async (
  page: Page,
  matchId: string,
  playerId: string,
  guestId: string,
  playerName: string
) => {
  const gameServerBaseURL = getGameServerBaseURL();
  const response = await page.request.post(
    `${gameServerBaseURL}/games/summonerwars/${matchId}/join`,
    {
      data: {
        playerID: playerId,
        playerName,
        data: { guestId },
      },
    }
  );
  if (!response.ok()) return null;
  const data = await response.json().catch(() => null) as { playerCredentials?: string } | null;
  return data?.playerCredentials ?? null;
};

const createSummonerWarsRoom = async (page: Page) => {
  const gameServerBaseURL = getGameServerBaseURL();
  const ownerGuestId = createGuestId('host');
  const response = await page.request.post(`${gameServerBaseURL}/games/summonerwars/create`, {
    data: { numPlayers: 2, setupData: { guestId: ownerGuestId } },
  });
  if (!response.ok()) return null;
  const data = await response.json().catch(() => null) as { matchID?: string } | null;
  const matchId = data?.matchID ?? null;
  if (!matchId) return null;
  matchOwnerGuestIds.set(matchId, ownerGuestId);
  const available = await waitForMatchAvailable(page, matchId, 15000);
  return available ? matchId : null;
};

const ensurePlayerIdInUrl = async (page: Page, playerId: string) => {
  const url = new URL(page.url());
  if (!url.searchParams.get('playerID')) {
    url.searchParams.set('playerID', playerId);
    await page.goto(url.toString());
  }
};

const completeFactionSelection = async (hostPage: Page, guestPage: Page) => {
  const selectionHeading = (page: Page) =>
    page.locator('h1').filter({ hasText: /閫夋嫨浣犵殑闃佃惀|Choose your faction/i });
  await expect(selectionHeading(hostPage)).toBeVisible({ timeout: 20000 });
  await expect(selectionHeading(guestPage)).toBeVisible({ timeout: 20000 });

  const factionCards = (page: Page) => page.locator('.grid > div');
  await factionCards(hostPage).nth(0).click();
  await hostPage.waitForTimeout(500);
  await factionCards(guestPage).nth(1).click();
  await guestPage.waitForTimeout(500);

  const readyButton = guestPage.locator('button').filter({ hasText: /鍑嗗|Ready/i });
  await expect(readyButton).toBeVisible({ timeout: 5000 });
  await readyButton.click();
  await hostPage.waitForTimeout(500);

  const startButton = hostPage.locator('button').filter({ hasText: /寮€濮嬫父鎴弢Start Game/i });
  await expect(startButton).toBeVisible({ timeout: 5000 });
  await expect(startButton).toBeEnabled({ timeout: 5000 });
  await startButton.click();

  await expect(hostPage.getByTestId('sw-end-phase')).toBeVisible({ timeout: 30000 });
  await expect(guestPage.getByTestId('sw-end-phase')).toBeVisible({ timeout: 30000 });
};

const waitForSummonerWarsUI = async (page: Page, timeout = 20000) => {
  await expect(page.getByTestId('sw-action-banner')).toBeVisible({ timeout });
  await expect(page.getByTestId('sw-hand-area')).toBeVisible({ timeout });
  await expect(page.getByTestId('sw-map-container')).toBeVisible({ timeout });
  await expect(page.getByTestId('sw-end-phase')).toBeVisible({ timeout });
};

const ensureDebugPanelOpen = async (page: Page) => {
  const panel = page.getByTestId('debug-panel');
  if (await panel.isVisible().catch(() => false)) return;
  await page.getByTestId('debug-toggle').click();
  await expect(panel).toBeVisible({ timeout: 5000 });
};

const closeDebugPanelIfOpen = async (page: Page) => {
  const panel = page.getByTestId('debug-panel');
  if (await panel.isVisible().catch(() => false)) {
    await page.getByTestId('debug-toggle').click();
    await expect(panel).toBeHidden({ timeout: 5000 });
  }
};

const ensureDebugStateTab = async (page: Page) => {
  await ensureDebugPanelOpen(page);
  const stateTab = page.getByTestId('debug-tab-state');
  if (await stateTab.isVisible().catch(() => false)) await stateTab.click();
};

const readCoreState = async (page: Page) => {
  await ensureDebugStateTab(page);
  const raw = await page.getByTestId('debug-state-json').innerText();
  const parsed = JSON.parse(raw);
  return parsed?.core ?? parsed?.G?.core ?? parsed;
};

const applyCoreState = async (page: Page, coreState: unknown) => {
  await ensureDebugStateTab(page);
  await page.getByTestId('debug-state-toggle-input').click();
  const input = page.getByTestId('debug-state-input');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(JSON.stringify(coreState));
  await page.getByTestId('debug-state-apply').click();
  await expect(input).toBeHidden({ timeout: 5000 }).catch(() => {});
};

const clickBoardElement = async (page: Page, selector: string) => {
  const clicked = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, selector);
  if (!clicked) throw new Error(`妫嬬洏鍏冪礌鏈壘鍒?${selector}`);
};

const cloneState = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const initializeSummonerWarsCore = (coreState: any, factions: Record<string, string>) => {
  const next = cloneState(coreState);
  const board = Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLS }, () => ({}))) as any[][];
  const players = { ...next.players };

  (['0', '1'] as const).forEach((pid) => {
    const factionId = factions[pid];
    if (!factionId) return;

    const deckData = createDeckByFactionId(factionId as any);
    const player = { ...players[pid] };
    const isBottom = pid === '0';
    const toArrayCoord = (pos: { row: number; col: number }) => (
      isBottom
        ? { row: BOARD_ROWS - 1 - pos.row, col: pos.col }
        : { row: pos.row, col: BOARD_COLS - 1 - pos.col }
    );

    const summonerCard = { ...deckData.summoner, id: `${deckData.summoner.id}-${pid}` };
    player.summonerId = summonerCard.id;
    const summonerPos = toArrayCoord(deckData.summonerPosition);
    board[summonerPos.row][summonerPos.col].unit = {
      cardId: summonerCard.id,
      card: summonerCard,
      owner: pid,
      position: summonerPos,
      damage: 0,
      boosts: 0,
      hasMoved: false,
      hasAttacked: false,
    };

    const gateCard = { ...deckData.startingGate, id: `${deckData.startingGate.id}-${pid}` };
    const gatePos = toArrayCoord(deckData.startingGatePosition);
    board[gatePos.row][gatePos.col].structure = {
      cardId: gateCard.id,
      card: gateCard,
      owner: pid,
      position: gatePos,
      damage: 0,
    };

    for (const startUnit of deckData.startingUnits) {
      const unitCard = { ...startUnit.unit, id: `${startUnit.unit.id}-${pid}` };
      const unitPos = toArrayCoord(startUnit.position);
      board[unitPos.row][unitPos.col].unit = {
        cardId: unitCard.id,
        card: unitCard,
        owner: pid,
        position: unitPos,
        damage: 0,
        boosts: 0,
        hasMoved: false,
        hasAttacked: false,
      };
    }

    const deckWithIds = deckData.deck.map((card, index) => ({ ...card, id: `${card.id}-${pid}-${index}` }));
    player.hand = deckWithIds.slice(0, HAND_SIZE);
    player.deck = deckWithIds.slice(HAND_SIZE);
    player.discard = [];
    player.activeEvents = [];
    player.moveCount = 0;
    player.attackCount = 0;
    player.hasAttackedEnemy = false;

    players[pid] = player;
  });

  next.board = board;
  next.players = players;
  return next;
};

const buildBaseCoreState = (coreState: any) => {
  const next = cloneState(coreState);
  next.hostStarted = true;
  next.selectedFactions = { '0': 'necromancer', '1': 'paladin' };
  next.readyPlayers = { '0': true, '1': true };
  return initializeSummonerWarsCore(next, next.selectedFactions);
};

// ============================================================================
// 鐘舵€佹敞鍏ヨ緟鍔╁嚱鏁?
// ============================================================================

/** 娓呯┖鎸囧畾鍖哄煙鐨勫崟浣嶅拰寤虹瓚 */
const clearArea = (board: any[][], positions: { row: number; col: number }[]) => {
  for (const pos of positions) {
    if (board[pos.row]?.[pos.col]) {
      board[pos.row][pos.col] = { ...board[pos.row][pos.col], unit: undefined, structure: undefined };
    }
  }
};

/** 鍦ㄦ寚瀹氫綅缃斁缃崟浣?*/
const placeUnit = (board: any[][], pos: { row: number; col: number }, unit: any) => {
  board[pos.row][pos.col] = {
    ...board[pos.row][pos.col],
    unit: { ...unit, position: { ...pos } },
  };
};

/** 鍒涘缓鍗曚綅鏁版嵁 */
const makeUnit = (overrides: Record<string, any>) => ({
  cardId: overrides.cardId ?? `test-${Date.now()}`,
  card: {
    id: overrides.cardId ?? 'test-unit',
    name: overrides.name ?? '娴嬭瘯鍗曚綅',
    cardType: 'unit',
    faction: overrides.faction ?? '鍫曡惤鐜嬪浗',
    cost: overrides.cost ?? 1,
    life: overrides.life ?? 2,
    strength: overrides.strength ?? 1,
    attackType: overrides.attackType ?? 'melee',
    unitClass: overrides.unitClass ?? 'common',
    abilities: overrides.abilities ?? [],
    spriteIndex: overrides.spriteIndex ?? 0,
    spriteAtlas: overrides.spriteAtlas ?? 'cards',
  },
  owner: overrides.owner ?? '0',
  position: overrides.position ?? { row: 0, col: 0 },
  damage: overrides.damage ?? 0,
  boosts: overrides.boosts ?? 0,
  charges: overrides.charges ?? 0,
  hasMoved: overrides.hasMoved ?? false,
  hasAttacked: overrides.hasAttacked ?? false,
});

/** 鍒涘缓鎵嬬墝鍗曚綅鍗?*/
const makeHandUnitCard = (id: string, name: string, overrides?: Record<string, any>) => ({
  id,
  name,
  cardType: 'unit',
  faction: overrides?.faction ?? '鍏堥攱鍐涘洟',
  cost: overrides?.cost ?? 1,
  life: overrides?.life ?? 3,
  strength: overrides?.strength ?? 1,
  attackType: overrides?.attackType ?? 'melee',
  unitClass: overrides?.unitClass ?? 'common',
  abilities: overrides?.abilities ?? [],
  spriteIndex: overrides?.spriteIndex ?? 0,
  spriteAtlas: overrides?.spriteAtlas ?? 'cards',
});

/**
 * 鍑嗗鍚稿彇鐢熷懡 beforeAttack 娴嬭瘯鐘舵€?
 * 鏀诲嚮鍓嶇壓鐗?鏍煎唴鍙嬫柟鍗曚綅
 */
const prepareLifeDrainBeforeAttackState = (coreState: any) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const attackerPos = { row: 5, col: 2 };
  const victimPos = { row: 4, col: 2 };
  const targetPos = { row: 5, col: 3 };
  clearArea(board, [attackerPos, victimPos, targetPos]);

  placeUnit(board, attackerPos, makeUnit({
    cardId: 'test-life-drainer',
    name: '鍚稿彇鑰?,
    faction: '鍫曡惤鐜嬪浗',
    strength: 2,
    life: 8,
    attackType: 'melee',
    abilities: ['life_drain'],
    owner: '0',
  }));

  placeUnit(board, victimPos, makeUnit({
    cardId: 'test-life-victim',
    name: '鐗虹壊鐩爣',
    strength: 1,
    life: 1,
    attackType: 'melee',
    owner: '0',
  }));

  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-life-enemy',
    name: '鏁屾柟鐩爣',
    strength: 1,
    life: 3,
    attackType: 'melee',
    owner: '1',
  }));

  return next;
};

/**
 * 鍑嗗鍦ｅ厜绠?beforeAttack 娴嬭瘯鐘舵€?
 * 鏀诲嚮鍓嶅純鐗屾彁鍗囨垬鍔?
 */
const prepareHolyArrowBeforeAttackState = (coreState: any) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
    player.hand = [
      makeHandUnitCard('holy-discard-1', '鍩庡楠戝＋'),
      makeHandUnitCard('holy-discard-2', '鍩庡鎴樺＋'),
      ...player.hand,
    ];
  }

