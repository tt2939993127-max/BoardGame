import '../../src/games/dicethrone/domain';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium, type Page } from 'playwright';
import { ensureSingleWorkerRuntime } from './e2e-runtime-manager.mjs';
import { assertNoFatalFrontendErrors, attachPageDiagnostics, initContext } from '../../e2e/helpers/common';
import { readDiceThroneHarnessState, waitForDiceThroneHarness } from '../../e2e/helpers/dicethrone';
import { createCharacterDice, initHeroState } from '../../src/games/dicethrone/domain/characters';
import { RESOURCE_IDS } from '../../src/games/dicethrone/domain/resources';

const OUT_DIR = 'temp/dicethrone-roll-context-recovery';
const SCREENSHOTS = {
    covered: `${OUT_DIR}/01-current-roll-covered.png`,
    restored: `${OUT_DIR}/02-covered-roll-restored.png`,
} as const;

type HarnessState = {
    core: {
        selectedCharacters: Record<string, string>;
        readyPlayers: Record<string, boolean>;
        hostStarted: boolean;
        players: Record<string, ReturnType<typeof initHeroState>>;
        activePlayerId: string;
        startingPlayerId: string;
        turnNumber: number;
        rollCount: number;
        rollLimit: number;
        rollDiceCount: number;
        rollConfirmed: boolean;
        pendingAttack: unknown;
        dice: ReturnType<typeof createCharacterDice>;
        currentRollContext?: { id?: string };
        rollContextRecovery?: { coveredRollRef?: { id?: string } };
    };
    sys: {
        phase: string;
        interaction?: { current?: unknown; queue?: unknown[] };
        eventStream?: { entries?: unknown[]; nextId?: number };
        actionLog?: { entries?: unknown[] };
    };
};

const PREPARE_RANDOM = {
    shuffle: <T>(items: T[]) => items,
    random: () => 0.5,
    d: (_faces: number) => 1,
    range: (min: number, _max: number) => min,
};

async function saveScreenshot(page: Page, path: string) {
    await mkdir(dirname(path), { recursive: true });
    const tempPath = path.replace(/\.png$/i, '.tmp.png');
    await rm(tempPath, { force: true });
    await page.screenshot({ path: tempPath, fullPage: false, timeout: 60000 });
    if ((await stat(tempPath)).size <= 0) {
        throw new Error(`截图写入为空: ${path}`);
    }
    await rm(path, { force: true });
    await rename(tempPath, path);
}

function logStep(step: string) {
    console.log(`[capture-dt-roll-context] ${step}`);
}

async function prepareRollScene(page: Page) {
    logStep('读取 Harness 初始状态');
    const initial = await readDiceThroneHarnessState<HarnessState>(page);
    logStep('已读取 Harness 初始状态');
    const next = JSON.parse(JSON.stringify(initial)) as HarnessState;
    logStep('已复制 Harness 初始状态');
    const player0 = initHeroState('0', 'monk', PREPARE_RANDOM);
    logStep('已初始化第一个武僧');
    const player1 = initHeroState('1', 'monk', PREPARE_RANDOM);
    logStep('已初始化第二个武僧');

    player0.resources[RESOURCE_IDS.HP] = 50;
    player0.resources[RESOURCE_IDS.CP] = 2;
    player1.resources[RESOURCE_IDS.HP] = 50;
    next.core.selectedCharacters = { '0': 'monk', '1': 'monk' };
    next.core.readyPlayers = { '0': true, '1': true };
    next.core.hostStarted = true;
    next.core.players['0'] = player0;
    next.core.players['1'] = player1;
    next.core.activePlayerId = '0';
    next.core.startingPlayerId = '0';
    next.core.turnNumber = 1;
    next.core.rollCount = 0;
    next.core.rollLimit = 3;
    next.core.rollDiceCount = 5;
    next.core.rollConfirmed = false;
    next.core.pendingAttack = null;
    next.core.dice = createCharacterDice('monk').map((die, index) => ({
        ...die,
        id: index,
        value: index + 1,
        isKept: false,
    }));
    delete next.core.currentRollContext;
    delete next.core.rollContextRecovery;
    next.sys.phase = 'offensiveRoll';
    next.sys.interaction = { current: undefined, queue: [] };
    next.sys.eventStream = { ...next.sys.eventStream, entries: [], nextId: 1 };
    next.sys.actionLog = { ...next.sys.actionLog, entries: [] };

    await page.evaluate((state) => {
        window.__BG_TEST_HARNESS__!.state.set(state);
    }, next);
    await page.waitForFunction(
        () => !document.querySelector('[data-testid="card-spotlight-overlay"]'),
        undefined,
        { timeout: 10000 },
    );
    logStep('已写入 offensiveRoll 测试状态');
}

async function waitForRollSettled(page: Page, expectedRollCount: number) {
    await page.waitForFunction((count) => {
        const state = window.__BG_TEST_HARNESS__?.state.get?.();
        const button = document.querySelector('[data-tutorial-id="dice-roll-button"]') as HTMLButtonElement | null;
        return state?.core?.rollCount === count
            && Boolean(state?.core?.currentRollContext?.id)
            && Boolean(button)
            && !/投掷中|rolling/i.test(button?.textContent ?? '');
    }, expectedRollCount, { timeout: 15000 });
}

async function main() {
    const startedAt = new Date().toISOString();
    logStep('启动专用 runtime');
    const runtimeResult = await ensureSingleWorkerRuntime({
        requestedScope: 'dicethrone-roll-context-recovery',
        target: 'dicethrone-roll-context-recovery',
        logger: console,
    });
    const runtimeController = runtimeResult.controller;
    process.env.PW_PORT = String(runtimeResult.runtime.ports.frontend);
    process.env.PW_GAME_SERVER_PORT = String(runtimeResult.runtime.ports.gameServer);
    process.env.GAME_SERVER_PORT = String(runtimeResult.runtime.ports.gameServer);
    process.env.PW_API_SERVER_PORT = String(runtimeResult.runtime.ports.apiServer);
    process.env.API_SERVER_PORT = String(runtimeResult.runtime.ports.apiServer);
    const baseURL = `http://127.0.0.1:${runtimeResult.runtime.ports.frontend}`;
    logStep(`runtime 就绪: ${baseURL}`);
    const browser = await chromium.launch({ headless: true });

    try {
        const context = await browser.newContext({
            baseURL,
            viewport: { width: 1920, height: 1080 },
        });
        await initContext(context, { storageKey: '__dicethrone_roll_context_recovery', skipTutorial: false });
        const page = await context.newPage();
        const diagnostics = attachPageDiagnostics(page);
        page.on('pageerror', (error) => {
            console.error('[capture-dt-roll-context][pageerror]', error.stack ?? error.message);
        });
        page.on('console', (message) => {
            if (message.type() === 'error') {
                console.error('[capture-dt-roll-context][console-error]', message.text());
            }
        });
        logStep('进入 DiceThrone 页面');
        await page.goto('/play/dicethrone', { waitUntil: 'commit', timeout: 120000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => undefined);
        logStep('等待 DiceThrone Harness');
        try {
            await waitForDiceThroneHarness(page, 60000);
        } catch (error) {
            const diagnostic = await page.evaluate(() => ({
                url: window.location.href,
                title: document.title,
                bodyText: document.body.innerText.slice(0, 500),
                harness: Boolean(window.__BG_TEST_HARNESS__),
                stateRegistered: window.__BG_TEST_HARNESS__?.state?.isRegistered?.() ?? false,
                commandRegistered: window.__BG_TEST_HARNESS__?.command?.isRegistered?.() ?? false,
            })).catch(() => null);
            console.error('[capture-dt-roll-context][harness-timeout]', JSON.stringify(diagnostic));
            throw error;
        }
        logStep('Harness 已就绪');
        await prepareRollScene(page);

        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        logStep('等待第一次投掷按钮');
        await rollButton.waitFor({ state: 'visible', timeout: 15000 });
        logStep('点击第一次投掷');
        await rollButton.click();
        await waitForRollSettled(page, 1);
        logStep('第一次投掷已结算');

        const firstContextId = await page.evaluate(() => window.__BG_TEST_HARNESS__?.state.get?.()?.core?.currentRollContext?.id);
        logStep(`第一次投掷上下文: ${firstContextId ?? '(缺失)'}`);
        logStep('点击第二次投掷，验证覆盖');
        await rollButton.click();
        await page.waitForFunction((coveredId) => {
            const state = window.__BG_TEST_HARNESS__?.state.get?.();
            return state?.core?.rollCount === 2
                && state.core.currentRollContext?.id !== coveredId
                && state.core.rollContextRecovery?.coveredRollRef?.id === coveredId;
        }, firstContextId, { timeout: 15000 });
        logStep('第二次投掷已覆盖第一次投掷');

        const restoreButton = page.getByTestId('restore-covered-roll-button');
        await restoreButton.waitFor({ state: 'visible', timeout: 10000 });
        logStep(`保存覆盖态截图: ${SCREENSHOTS.covered}`);
        await saveScreenshot(page, SCREENSHOTS.covered);
        logStep('点击回到覆盖前骰区');
        await restoreButton.click();
        await page.waitForFunction((coveredId) => {
            const core = window.__BG_TEST_HARNESS__?.state.get?.()?.core;
            return core?.currentRollContext?.id === coveredId && core.rollContextRecovery === undefined;
        }, firstContextId, { timeout: 15000 });
        logStep('旧投掷已恢复，恢复点已清空');
        logStep(`保存恢复态截图: ${SCREENSHOTS.restored}`);
        await saveScreenshot(page, SCREENSHOTS.restored);
        await assertNoFatalFrontendErrors([{ label: 'roll-context-recovery', diagnostics }]);

        await writeFile(`${OUT_DIR}/_latest-run.json`, `${JSON.stringify({
            status: 'completed',
            startedAt,
            finishedAt: new Date().toISOString(),
            firstContextId,
            screenshots: SCREENSHOTS,
        }, null, 2)}\n`, 'utf8');
        await context.close();
    } finally {
        await browser.close();
        runtimeController?.stop('DiceThrone 骰区恢复验证结束');
    }
}

void main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error('[capture-dt-roll-context][fatal]', message);
    process.exitCode = 1;
});
