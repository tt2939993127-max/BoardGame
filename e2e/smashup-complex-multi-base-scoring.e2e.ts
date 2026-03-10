import { test, expect } from './framework';
import { attachPageDiagnostics } from './helpers/common';

test.describe('大杀四方 - afterScoring 响应窗口', () => {
    test('基地计分后 afterScoring 响应窗口正常打开', async ({ page, game }, testInfo) => {
        test.setTimeout(180000);

        const diagnostics = attachPageDiagnostics(page);
        page.on('console', (msg) => {
            if (msg.type() === 'error' || msg.text().includes('[LocalGame]')) {
                console.log(`[浏览器控制台] ${msg.type()}: ${msg.text()}`);
            }
        });

        try {
            await page.goto('/play/smashup');

            await page.waitForFunction(
                () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
                { timeout: 30000 },
            );

            await game.setupScene({
                gameId: 'smashup',
                player0: {
                    hand: [
                        { uid: 'card-after-1', defId: 'giant_ant_we_are_the_champions', type: 'action', owner: '0' },
                    ],
                    field: [
                        { uid: 'queen-1', defId: 'giant_ant_killer_queen', baseIndex: 0, owner: '0', controller: '0' },
                        { uid: 'master-1', defId: 'ninja_master', baseIndex: 0, owner: '0', controller: '0' },
                    ],
                    factions: ['giant_ants', 'ninjas'],
                },
                player1: {
                    hand: [],
                    field: [
                        { uid: 'assassin-1', defId: 'ninja_tiger_assassin', baseIndex: 0, owner: '1', controller: '1' },
                    ],
                    factions: ['ninjas', 'wizards'],
                },
                bases: [
                    { defId: 'base_the_jungle', minions: [] },
                ],
                currentPlayer: '0',
                phase: 'playCards',
            });

            await page.waitForFunction(
                () => {
                    const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                    return state?.sys?.phase === 'playCards'
                        && state?.core?.factionSelection === undefined
                        && state?.core?.players?.['0']?.hand?.length === 1
                        && state?.core?.bases?.[0]?.minions?.length === 3;
                },
                { timeout: 30000 },
            );

            await game.screenshot('01-scene-ready', testInfo);

            await game.advancePhase();
            await page.waitForTimeout(1000);

            const stateAfterAdvance = await page.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    phase: state?.sys?.phase,
                    windowType: state?.sys?.responseWindow?.current?.windowType ?? null,
                    interactionId: state?.sys?.interaction?.current?.id ?? null,
                    interactionSource: state?.sys?.interaction?.current?.sourceId ?? null,
                    p0Hand: state?.core?.players?.['0']?.hand?.map((card: any) => card.defId) ?? [],
                    scoringEligibleBaseIndices: state?.core?.scoringEligibleBaseIndices ?? null,
                };
            });
            console.log('[TEST] 推进后状态:', stateAfterAdvance);

            await page.waitForFunction(
                () => {
                    const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                    const windowType = state?.sys?.responseWindow?.current?.windowType;
                    return state?.sys?.phase === 'scoreBases'
                        && (windowType === 'meFirst' || windowType === 'afterScoring');
                },
                { timeout: 15000, polling: 100 },
            );

            const responseWindowState = await page.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    phase: state?.sys?.phase,
                    windowType: state?.sys?.responseWindow?.current?.windowType,
                    currentResponder: state?.sys?.responseWindow?.current?.responderQueue?.[
                        state?.sys?.responseWindow?.current?.currentResponderIndex ?? 0
                    ],
                };
            });

            expect(responseWindowState.phase).toBe('scoreBases');
            expect(['meFirst', 'afterScoring']).toContain(responseWindowState.windowType);

            await expect(page.getByTestId('me-first-overlay')).toBeVisible();
            await expect(page.getByTestId('me-first-pass-button')).toBeVisible();

            if (responseWindowState.windowType === 'meFirst') {
                await game.screenshot('02-me-first-open', testInfo);
                await page.getByTestId('me-first-pass-button').click();
                await page.waitForTimeout(500);
                await game.screenshot('03-p0-passed-me-first', testInfo);

                await page.getByTestId('me-first-pass-button').click();

                await page.waitForFunction(
                    () => {
                        const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                        return state?.sys?.responseWindow?.current?.windowType === 'afterScoring';
                    },
                    { timeout: 15000 },
                );
            }

            const afterScoringState = await page.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    phase: state?.sys?.phase,
                    windowType: state?.sys?.responseWindow?.current?.windowType,
                    currentResponder: state?.sys?.responseWindow?.current?.responderQueue?.[
                        state?.sys?.responseWindow?.current?.currentResponderIndex ?? 0
                    ],
                };
            });

            expect(afterScoringState.phase).toBe('scoreBases');
            expect(afterScoringState.windowType).toBe('afterScoring');

            await expect(page.getByTestId('me-first-overlay')).toBeVisible();
            await expect(page.getByTestId('me-first-pass-button')).toBeVisible();
            await game.screenshot('04-after-scoring-open', testInfo);

            await page.getByTestId('me-first-pass-button').click();
            await page.waitForTimeout(500);
            await game.screenshot('05-p0-passed-after-scoring', testInfo);

            const afterFirstAfterScoringPass = await page.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    phase: state?.sys?.phase,
                    windowType: state?.sys?.responseWindow?.current?.windowType ?? null,
                    currentResponder: state?.sys?.responseWindow?.current?.responderQueue?.[
                        state?.sys?.responseWindow?.current?.currentResponderIndex ?? 0
                    ] ?? null,
                };
            });
            console.log('[TEST] afterScoring 首次 PASS 后状态:', afterFirstAfterScoringPass);

            if (afterFirstAfterScoringPass.windowType === 'afterScoring') {
                await expect(page.getByTestId('me-first-pass-button')).toBeVisible();
                await page.getByTestId('me-first-pass-button').click();
            }

            await page.waitForFunction(
                () => {
                    const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                    return !state?.sys?.responseWindow?.current
                        && state?.sys?.phase === 'playCards'
                        && state?.core?.currentPlayerIndex === 1;
                },
                { timeout: 15000 },
            );

            const finalState = await page.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    phase: state?.sys?.phase,
                    currentPlayerIndex: state?.core?.currentPlayerIndex ?? null,
                    responseWindowId: state?.sys?.responseWindow?.current?.id ?? null,
                    p0Vp: state?.core?.players?.['0']?.vp ?? 0,
                    p1Vp: state?.core?.players?.['1']?.vp ?? 0,
                };
            });

            expect(finalState.responseWindowId).toBeNull();
            expect(finalState.phase).toBe('playCards');
            expect(finalState.currentPlayerIndex).toBe(1);
            expect(finalState.p0Vp).toBeGreaterThan(0);

            await game.screenshot('06-final-state', testInfo);
        } catch (error) {
            if (diagnostics.errors.length > 0) {
                console.log('[页面诊断]', diagnostics.errors);
            }
            throw error;
        }
    });
});
