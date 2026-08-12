import { expect, test } from '@playwright/test';
import {
    assertNoFatalFrontendErrors,
    attachPageDiagnostics,
} from '../helpers/common';
import {
    createJackSpiritMovementRollReadyRuntimeCore,
    createJackSpiritNaturalMonsterTurnBeforeRollRuntimeCore,
    expectVisiblePhysicalDiceBox,
    initBetrayalContext,
    injectCore,
    saveScreenshot,
    setHarnessRandomQueue,
    waitForPhysicalDiceSettled,
    waitForBetrayalPageReady,
    warmBetrayalFrontend,
} from './betrayalTestHelpers';

const EVIDENCE_DIR = 'evidence/betrayal-first-scenario-jack-spirit-movement-roll';
const ROLL_READY_SCREENSHOT = `${EVIDENCE_DIR}/01-山屋惊魂-第一剧本-杰克之灵移动骰后.jpg`;
const MOVED_SCREENSHOT = `${EVIDENCE_DIR}/02-山屋惊魂-第一剧本-杰克之灵移动扣点后.jpg`;
const NATURAL_TURN_BEFORE_SCREENSHOT = `${EVIDENCE_DIR}/03-山屋惊魂-第一剧本-杰克之灵自然回合-上一英雄结束前.jpg`;
const NATURAL_TURN_ROLL_SCREENSHOT = `${EVIDENCE_DIR}/04-山屋惊魂-第一剧本-杰克之灵自然回合-移动骰出现.jpg`;
const ROLL_ANIMATING_SCREENSHOT = `${EVIDENCE_DIR}/00-山屋惊魂-第一剧本-杰克之灵移动骰滚动中.jpg`;

const expectPhysicalDiceMotionKeepsStageStable = async (
    page: import('@playwright/test').Page,
    rollPanel: import('@playwright/test').Locator,
) => {
    const physicsSource = rollPanel.getByTestId('betrayal-house-dice-physics-source');
    await expect.poll(async () => physicsSource.getAttribute('data-dice-settled'), {
        timeout: 5000,
    }).toBe('false');

    const readSample = () => rollPanel.evaluate((panel) => {
        type DebugSnapshot = {
            dice?: Array<{ layout?: { visualWidth?: number; visualHeight?: number } | null }>;
            canvas?: { clientWidth?: number; clientHeight?: number } | null;
        };
        const group = panel.querySelector('[data-testid="betrayal-house-dice-3d-group"]') as HTMLElement | null;
        const canvas = panel.querySelector('canvas') as HTMLCanvasElement | null;
        const debugKey = group?.dataset.diceDebugKey;
        const debugRegistry = (window as typeof window & {
            __diceBoxThreeDebug?: Record<string, () => DebugSnapshot | null>;
        }).__diceBoxThreeDebug ?? {};
        const snapshot = debugKey ? debugRegistry[debugKey]?.() ?? null : null;
        const visibleSizes = (snapshot?.dice ?? [])
            .map((die) => Math.min(die.layout?.visualWidth ?? 0, die.layout?.visualHeight ?? 0))
            .filter((size) => size > 0);
        return {
            canvasWidth: snapshot?.canvas?.clientWidth ?? canvas?.clientWidth ?? 0,
            canvasHeight: snapshot?.canvas?.clientHeight ?? canvas?.clientHeight ?? 0,
            diceCount: snapshot?.dice?.length ?? 0,
            minVisibleDieSize: visibleSizes.length ? Math.min(...visibleSizes) : 0,
        };
    });
    const first = await readSample();
    await page.waitForTimeout(120);
    const second = await readSample();

    expect(first.canvasWidth, `杰克之灵移动骰滚动中画布宽度必须可用：${JSON.stringify(first)}`).toBeGreaterThanOrEqual(160);
    expect(first.canvasHeight, `杰克之灵移动骰滚动中画布高度必须可用：${JSON.stringify(first)}`).toBeGreaterThanOrEqual(120);
    expect(second.canvasWidth).toBe(first.canvasWidth);
    expect(second.canvasHeight).toBe(first.canvasHeight);
    expect(second.diceCount).toBe(first.diceCount);
    expect(second.minVisibleDieSize, `杰克之灵移动骰滚动中不能缩成不可见小点：${JSON.stringify({ first, second })}`).toBeGreaterThanOrEqual(18);
};

const switchRoomMapToFloor = async (
    page: import('@playwright/test').Page,
    floor: 'upper' | 'ground' | 'basement',
) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        if (await page.getByTestId(`betrayal-room-floor-${floor}`).isVisible({ timeout: 500 }).catch(() => false)) {
            return;
        }
        const upperVisible = await page.getByTestId('betrayal-room-floor-upper').isVisible({ timeout: 250 }).catch(() => false);
        const basementVisible = await page.getByTestId('betrayal-room-floor-basement').isVisible({ timeout: 250 }).catch(() => false);
        if (floor === 'upper' || (floor === 'ground' && basementVisible)) {
            await page.getByTestId('betrayal-room-floor-up').click();
        } else if (floor === 'basement' || (floor === 'ground' && upperVisible)) {
            await page.getByTestId('betrayal-room-floor-down').click();
        }
    }
    await expect(page.getByTestId(`betrayal-room-floor-${floor}`)).toBeVisible();
};

test.describe('山屋惊魂第一剧本杰克之灵移动骰边界', () => {
    test('死叛徒回合会显示杰克之灵 Speed 3 移动骰，并按点数扣减移动', async ({ page, context }) => {
        test.setTimeout(120000);
        await initBetrayalContext(context);
        const diagnostics = attachPageDiagnostics(page, 'betrayal-first-scenario-jack-spirit-movement-roll');

        await page.setViewportSize({ width: 1600, height: 900 });
        await warmBetrayalFrontend(context);
        await page.goto('/play/betrayal?players=3&seat0=human&seat1=human&seat2=human&playerID=2&seed=jack-spirit-movement-roll', {
            waitUntil: 'domcontentloaded',
        });
        await waitForBetrayalPageReady(page);

        await injectCore(page, createJackSpiritMovementRollReadyRuntimeCore());
        await expect(page.getByTestId('betrayal-board')).toBeVisible({ timeout: 30000 });
        await expect(page.getByTestId('betrayal-runtime-header-grid')).toContainText(/作祟中|恶兆后|Haunt/i);
        await expect.poll(async () => page.evaluate(() => {
            const state = (window as typeof window & {
                __BG_TEST_HARNESS__?: {
                    state?: {
                        get?: () => {
                            core?: {
                                currentPlayer?: string;
                                movesRemaining?: number;
                                recentRoll?: { kind?: string; trait?: string; dice?: number[] };
                            };
                        };
                    };
                };
            }).__BG_TEST_HARNESS__?.state?.get?.();
            return {
                currentPlayer: state?.core?.currentPlayer,
                movesRemaining: state?.core?.movesRemaining,
                recentRollKind: state?.core?.recentRoll?.kind,
                recentRollTrait: state?.core?.recentRoll?.trait,
                recentRollDice: state?.core?.recentRoll?.dice,
            };
        })).toMatchObject({
            currentPlayer: '2',
            movesRemaining: 2,
            recentRollKind: 'monsterMoveRoll',
            recentRollTrait: 'speed',
            recentRollDice: [1, 1, 0],
        });
        await expect(page.getByTestId('betrayal-status-chip')).toContainText(/当前回合|剩余移动 2/);
        await expect(page.getByTestId('betrayal-room-latest-feedback')).toContainText(/杰克之灵速度 3 投出 2|本回合可移动 2 间/);
        const rollPanel = page.getByTestId('betrayal-recent-roll-panel');
        await expectVisiblePhysicalDiceBox(rollPanel);
        await expectPhysicalDiceMotionKeepsStageStable(page, rollPanel);
        await saveScreenshot(page, ROLL_ANIMATING_SCREENSHOT);
        await waitForPhysicalDiceSettled(rollPanel);
        await saveScreenshot(page, ROLL_READY_SCREENSHOT);

        await page.getByTestId('betrayal-roll-continue').click();
        await expect(page.getByTestId('betrayal-action-monsterTurnStart')).toHaveCount(0);
        await expect(page.getByTestId('betrayal-action-monsterMovementRoll')).toHaveCount(0);
        await expect(page.getByTestId('betrayal-action-monsterMove')).toHaveCount(0);
        await expect(page.getByTestId('betrayal-action-move')).toBeEnabled();
        await page.getByTestId('betrayal-action-move').click();
        await switchRoomMapToFloor(page, 'upper');
        const moveTarget = page.getByTestId('betrayal-room-upper-landing');
        await expect(moveTarget).toBeVisible();
        await expect(moveTarget).toBeEnabled();
        await moveTarget.click();
        await expect(page.getByTestId('betrayal-room-latest-feedback')).toContainText('杰克之灵游荡到了上层起始点');
        await expect(page.getByTestId('betrayal-status-chip')).toContainText('剩余移动 1');
        await expect.poll(async () => page.evaluate(() => {
            const state = (window as typeof window & {
                __BG_TEST_HARNESS__?: {
                    state?: {
                        get?: () => {
                            core?: {
                                currentPlayer?: string;
                                movesRemaining?: number;
                                scenarioRuntime?: { jackSpiritRoomId?: string | null };
                            };
                        };
                    };
                };
            }).__BG_TEST_HARNESS__?.state?.get?.();
            return {
                currentPlayer: state?.core?.currentPlayer,
                movesRemaining: state?.core?.movesRemaining,
                jackSpiritRoomId: state?.core?.scenarioRuntime?.jackSpiritRoomId,
            };
        })).toMatchObject({
            currentPlayer: '2',
            movesRemaining: 1,
            jackSpiritRoomId: 'upper-landing',
        });
        await saveScreenshot(page, MOVED_SCREENSHOT);

        assertNoFatalFrontendErrors([{ label: 'betrayal-first-scenario-jack-spirit-movement-roll', diagnostics }]);
    });

    test('叛徒死亡后轮到叛徒时会自然进入杰克之灵移动骰', async ({ page, context }) => {
        test.setTimeout(120000);
        await initBetrayalContext(context);
        const diagnostics = attachPageDiagnostics(page, 'betrayal-first-scenario-jack-spirit-natural-turn');

        await page.setViewportSize({ width: 1600, height: 900 });
        await warmBetrayalFrontend(context);
        await page.goto('/play/betrayal?players=3&seat0=human&seat1=human&seat2=human&playerID=1&seed=jack-spirit-natural-turn', {
            waitUntil: 'domcontentloaded',
        });
        await waitForBetrayalPageReady(page);

        await injectCore(page, createJackSpiritNaturalMonsterTurnBeforeRollRuntimeCore());
        await expect(page.getByTestId('betrayal-board')).toBeVisible({ timeout: 30000 });
        await expect.poll(async () => page.evaluate(() => {
            const state = (window as typeof window & {
                __BG_TEST_HARNESS__?: {
                    state?: {
                        get?: () => {
                            core?: {
                                currentPlayer?: string;
                                movesRemaining?: number;
                                recentRoll?: { kind?: string; trait?: string; dice?: number[] } | null;
                                scenarioRuntime?: {
                                    jackSpiritReleased?: boolean;
                                    jackSpiritRoomId?: string | null;
                                };
                            };
                        };
                    };
                };
            }).__BG_TEST_HARNESS__?.state?.get?.();
            return {
                currentPlayer: state?.core?.currentPlayer,
                jackSpiritReleased: state?.core?.scenarioRuntime?.jackSpiritReleased,
                jackSpiritRoomId: state?.core?.scenarioRuntime?.jackSpiritRoomId,
                recentRollKind: state?.core?.recentRoll?.kind ?? null,
                movesRemaining: state?.core?.movesRemaining,
            };
        })).toMatchObject({
            currentPlayer: '1',
            jackSpiritReleased: true,
            recentRollKind: null,
        });
        await expect(page.getByTestId('betrayal-action-endTurn')).toBeEnabled();
        await saveScreenshot(page, NATURAL_TURN_BEFORE_SCREENSHOT);

        await setHarnessRandomQueue(page, [0.5, 0.5, 0.01]);
        await page.getByTestId('betrayal-action-endTurn').click();
        await expect.poll(async () => page.evaluate(() => {
            const state = (window as typeof window & {
                __BG_TEST_HARNESS__?: {
                    state?: {
                        get?: () => {
                            core?: {
                                currentPlayer?: string;
                                activeRoomId?: string;
                                movesRemaining?: number;
                                recentRoll?: { kind?: string; trait?: string; dice?: number[] };
                                scenarioRuntime?: { jackSpiritRoomId?: string | null };
                            };
                        };
                    };
                };
            }).__BG_TEST_HARNESS__?.state?.get?.();
            return {
                currentPlayer: state?.core?.currentPlayer,
                activeRoomId: state?.core?.activeRoomId,
                jackSpiritRoomId: state?.core?.scenarioRuntime?.jackSpiritRoomId,
                activeRoomMatchesJackSpirit: state?.core?.activeRoomId === state?.core?.scenarioRuntime?.jackSpiritRoomId,
                movesRemaining: state?.core?.movesRemaining,
                recentRollKind: state?.core?.recentRoll?.kind,
                recentRollTrait: state?.core?.recentRoll?.trait,
                recentRollDice: state?.core?.recentRoll?.dice,
            };
        })).toMatchObject({
            currentPlayer: '2',
            activeRoomMatchesJackSpirit: true,
            movesRemaining: 2,
            recentRollKind: 'monsterMoveRoll',
            recentRollTrait: 'speed',
            recentRollDice: [1, 1, 0],
        });
        await expect(page.getByTestId('betrayal-room-latest-feedback')).toContainText(/杰克之灵速度 3 投出 2|本回合可移动 2 间/);
        await saveScreenshot(page, NATURAL_TURN_ROLL_SCREENSHOT);

        assertNoFatalFrontendErrors([{ label: 'betrayal-first-scenario-jack-spirit-natural-turn', diagnostics }]);
    });
});
