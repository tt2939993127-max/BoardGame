import { test } from '@playwright/test';
import { expect, createSummonerWarsMatch } from './fixtures';
import { GameTestContext } from './framework/GameTestContext';
import {
  createSWRoomViaAPI,
  GAME_NAME,
  clickFactionReady,
  clickFactionStart,
  getFactionCard,
  getFactionStartButton,
  getPlayerStatusCard,
  initSWContext,
  selectFactionById,
  waitForFactionSelectionReady,
  waitForSummonerWarsUI,
} from './helpers/summonerwars';
import {
  ensureGameServerAvailable,
  joinMatchViaAPI,
  seedMatchCredentials,
} from './helpers/common';

async function joinGuestToSelectionMatch(page: import('@playwright/test').Page, matchId: string) {
  const credentials = await joinMatchViaAPI(page, GAME_NAME, matchId, '1', 'Guest-SW-Selection');
  if (!credentials) {
    throw new Error(`Failed to join SummonerWars match: ${matchId}`);
  }

  await seedMatchCredentials(page, GAME_NAME, matchId, '1', credentials);
  await page.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=1`, { waitUntil: 'domcontentloaded' });
}

test.describe('SummonerWars selection and turn-lock flows', () => {
  test('main flow enters match from faction selection', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const hostContext = await browser.newContext({ baseURL });
    await initSWContext(hostContext, '__sw_selection_host');
    const hostPage = await hostContext.newPage();
    const hostGame = new GameTestContext(hostPage);

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await ensureGameServerAvailable(hostPage))) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSWRoomViaAPI(hostPage);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    await waitForFactionSelectionReady(hostPage);
    await hostGame.screenshot('selection-host-entry', testInfo);

    const guestContext = await browser.newContext({ baseURL });
    await initSWContext(guestContext, '__sw_selection_guest');
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/', { waitUntil: 'domcontentloaded' });
    await joinGuestToSelectionMatch(guestPage, matchId);
    await waitForFactionSelectionReady(guestPage);

    await selectFactionById(hostPage, 'necromancer');
    await expect(getFactionCard(hostPage, 'necromancer')).toHaveAttribute('data-selected', 'true');

    await selectFactionById(guestPage, 'trickster');
    await expect(getFactionCard(guestPage, 'trickster')).toHaveAttribute('data-selected', 'true');
    await hostGame.screenshot('selection-both-picked', testInfo);

    await clickFactionReady(guestPage);
    await expect(getPlayerStatusCard(hostPage, '1')).toHaveAttribute('data-ready', 'true');
    await expect(getFactionStartButton(hostPage)).toBeEnabled();

    await clickFactionStart(hostPage);
    await waitForSummonerWarsUI(hostPage, 30000);
    await waitForSummonerWarsUI(guestPage, 30000);
    await hostGame.screenshot('selection-game-started', testInfo);

    await expect(hostPage.getByTestId('sw-phase-tracker')).toBeVisible();
    await expect(hostPage.getByTestId('sw-hand-area')).toBeVisible();
    await expect(hostPage.getByTestId('sw-map-container')).toBeVisible();

    await hostContext.close();
    await guestContext.close();
  });

  test('ui stability keeps end-phase locked for waiting player', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await createSummonerWarsMatch(browser, baseURL, 'necromancer', 'trickster');

    if (!setup) {
      test.skip(true, 'Game server unavailable or room creation failed');
    }

    const { hostPage, guestPage, hostContext, guestContext } = setup!;
    const guestGame = new GameTestContext(guestPage);

    await expect(hostPage.getByTestId('sw-end-phase')).toBeEnabled();
    await expect(guestPage.getByTestId('sw-end-phase')).toBeDisabled();
    await expect(guestPage.getByTestId('sw-action-banner')).toContainText(/等待对手|Waiting for opponent/i);
    await guestGame.screenshot('ui-guest-turn-locked', testInfo);

    await hostContext.close();
    await guestContext.close();
  });
});
