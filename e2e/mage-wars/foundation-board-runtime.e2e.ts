import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
    assertNoFatalFrontendErrors,
    attachPageDiagnostics,
    initContext,
    waitForFrontendAssets,
    waitForTestHarness,
} from '../helpers/common';

const SCREENSHOT_PATH = 'test-results/evidence-screenshots/mage-wars/foundation-board-runtime/e2e-desktop-board.png';
const MOBILE_SCREENSHOT_PATH = 'test-results/evidence-screenshots/mage-wars/foundation-board-runtime/e2e-mobile-landscape-board.png';

type MageWarsHarnessPlayer = {
    mageId: string;
    life: number;
    mageZoneId: string;
    damage: number;
    mana: number;
    channeling: number;
    actionReady: boolean;
    quickcastReady: boolean;
    guarding: boolean;
    spellbookCount: number;
    preparedSpellSlots: number;
    preparedSpellCardIds: number[];
    discardSpellCardIds: number[];
};

type MageWarsHarnessZone = {
    id: string;
    occupantIds: string[];
    fieldCardIds?: number[];
    [key: string]: unknown;
};

type MageWarsHarnessState = {
    sys: {
        phase?: string;
        [key: string]: unknown;
    };
    core: {
        playerOrder: string[];
        currentPlayerId: string;
        turnNumber: number;
        players: Record<string, MageWarsHarnessPlayer>;
        arena: MageWarsHarnessZone[];
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

type MageWarsHarness = {
    state?: {
        get: () => MageWarsHarnessState | null;
        set: (state: MageWarsHarnessState) => Promise<void> | void;
    };
};

async function openMageWarsBoard(context: BrowserContext, page: Page, storageKey: string) {
    await initContext(context, {
        storageKey,
        skipImageGate: false,
        blockCdnAssets: false,
        locale: 'zh-CN',
    });
    const diagnostics = attachPageDiagnostics(page);

    await page.goto('/play/mage-wars', { waitUntil: 'domcontentloaded' });
    await waitForFrontendAssets(page, 45_000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    const board = page.getByTestId('mage-wars-board');
    await expect(board).toBeVisible({ timeout: 30_000 });
    await expect(board).toContainText('学徒竞技场');
    await expect(board).toContainText('兽王');
    await expect(board).toContainText('女祭司');
    await expect(board).toContainText('法术书');
    await expect(board).toContainText(/对手(已)?计划/);

    await page.waitForFunction(() => Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 10 && image.getBoundingClientRect().height > 10)
        .every((image) => image.naturalWidth > 0 && image.naturalHeight > 0), undefined, { timeout: 30_000 });

    return diagnostics;
}

async function auditMageWarsImages(page: Page, expectedVisibleAlts: string[] = []) {
    await page.waitForFunction(() => Array.from(document.images)
        .filter((image) => {
            const rect = image.getBoundingClientRect();
            return rect.width > 10 && rect.height > 10;
        })
        .every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), undefined, { timeout: 30_000 });

    const imageAudit = await page.evaluate(() => {
        const images = Array.from(document.images).map((image) => {
            const rect = image.getBoundingClientRect();
            return {
                alt: image.alt,
                currentSrc: image.currentSrc || image.src,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                complete: image.complete,
                rect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                },
            };
        });
        return {
            images,
            missingPixels: images.filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0),
            viteOverlay: Boolean(document.querySelector('vite-error-overlay')),
        };
    });

    expect(imageAudit.viteOverlay).toBe(false);
    expect(imageAudit.missingPixels, JSON.stringify(imageAudit.missingPixels, null, 2)).toHaveLength(0);
    expect(imageAudit.images.some((image) => image.alt === '攻击骰')).toBe(true);
    expect(imageAudit.images.some((image) => image.alt === '隐藏计划')).toBe(true);
    expectedVisibleAlts.forEach((expectedAlt) => {
        expect(imageAudit.images.some((image) => image.alt === expectedAlt)).toBe(true);
    });

    return imageAudit;
}

async function applyMageWarsSaturatedState(page: Page) {
    await waitForTestHarness(page, 10_000);
    await page.evaluate(() => {
        const harness = (window as Window & {
            __BG_TEST_HARNESS__?: MageWarsHarness;
        }).__BG_TEST_HARNESS__;
        const snapshot = harness?.state?.get?.();
        if (!snapshot || !harness?.state?.set) {
            throw new Error('mage-wars test harness state injector unavailable');
        }

        const next = structuredClone(snapshot);
        const [selfId, opponentId] = next.core.playerOrder;
        if (!selfId || !opponentId) {
            throw new Error('mage-wars saturated state requires two players');
        }

        next.sys = {
            ...next.sys,
            phase: 'creatureAction',
        };
        next.core = {
            ...next.core,
            currentPlayerId: selfId,
            turnNumber: 3,
            players: {
                ...next.core.players,
                [selfId]: {
                    ...next.core.players[selfId],
                    mageId: 'warlock_apprentice',
                    life: 24,
                    mageZoneId: 'a2',
                    damage: 7,
                    mana: 14,
                    channeling: 10,
                    actionReady: true,
                    quickcastReady: true,
                    guarding: false,
                    spellbookCount: 26,
                    preparedSpellSlots: 2,
                    preparedSpellCardIds: [1700, 1804],
                    discardSpellCardIds: [2224, 1903, 1806],
                },
                [opponentId]: {
                    ...next.core.players[opponentId],
                    mageId: 'priestess_apprentice',
                    life: 24,
                    mageZoneId: 'b2',
                    damage: 5,
                    mana: 18,
                    channeling: 10,
                    actionReady: true,
                    quickcastReady: true,
                    guarding: true,
                    spellbookCount: 26,
                    preparedSpellSlots: 2,
                    preparedSpellCardIds: [1901, 3408],
                    discardSpellCardIds: [1706],
                },
            },
            arena: next.core.arena.map((zone: MageWarsHarnessZone) => ({
                ...zone,
                occupantIds: zone.id === 'a2' ? [selfId] : zone.id === 'b2' ? [opponentId] : [],
                fieldCardIds: ({
                    a2: [2803],
                    b2: [2909],
                    a3: [2801],
                    b3: [2224],
                } as Record<string, number[]>)[zone.id] ?? [],
            })),
        };

        return harness.state.set(next);
    });

    await page.waitForFunction(() => {
        const state = (window as Window & {
            __BG_TEST_HARNESS__?: MageWarsHarness;
        }).__BG_TEST_HARNESS__?.state?.get?.();
        const [selfId, opponentId] = state?.core?.playerOrder ?? [];
        const self = selfId ? state?.core?.players?.[selfId] : null;
        const opponent = opponentId ? state?.core?.players?.[opponentId] : null;
        return state?.sys?.phase === 'creatureAction'
            && self?.mageId === 'warlock_apprentice'
            && opponent?.mageId === 'priestess_apprentice'
            && self?.preparedSpellCardIds?.length === 2
            && self?.discardSpellCardIds?.length === 3
            && opponent?.guarding === true
            && self?.mageZoneId === 'a2'
            && opponent?.mageZoneId === 'b2';
    }, undefined, { timeout: 10_000 });
    await page.waitForTimeout(250);
}

test.describe('Mage Wars foundation runtime board', () => {
    test('真实入口加载正式牌桌素材并落桌面验收截图', async ({ context, page }) => {
        test.setTimeout(60_000);
        const diagnostics = await openMageWarsBoard(context, page, 'mage-wars-foundation-runtime-board');
        await applyMageWarsSaturatedState(page);
        const board = page.getByTestId('mage-wars-board');
        await expect(page.getByTestId('mage-wars-stage-chip')).toHaveText('行动环节');
        await expect(page.getByTestId('mage-wars-stage-chip')).not.toContainText('选择目标');
        await expect(page.getByTestId('mage-wars-prepared-source-badge')).toHaveText('来源');
        await expect(page.getByTestId('mage-wars-mage-hud-current-badge')).toHaveText(/行动中/);
        await expect(page.getByTestId('mage-wars-mage-hud-active-hint')).toHaveText('选择目标');
        await expect(page.getByTestId('mage-wars-field-card-target-badge')).toHaveText('可选');
        await expect(board).toContainText('己方已计划');
        await expect(board).toContainText('弃牌 3');
        await expect(board).toContainText('掷骰预备');
        await expect(page.getByTestId('mage-wars-attack-die-face').first()).toBeVisible();
        await expect(page.getByTestId('mage-wars-effect-die-face').first()).toBeVisible();
        await expect(page.getByLabel('12 面效果骰').first()).toBeVisible();
        const imageAudit = await auditMageWarsImages(page, [
            '火球术',
            '法师祸咒',
            '烈焰狱鬼',
            '西锁骑士',
            '火烙魔婴',
            '缠绕藤蔓',
            '邪术师',
            '女祭司',
        ]);
        expect(imageAudit.images.some((image) => image.alt === '法师战争标准竞技场' && image.rect.width >= 1400)).toBe(true);
        const desktopLayoutAudit = await page.evaluate(() => {
            const arenaStage = document.querySelector<HTMLElement>('[data-testid="mage-wars-arena-stage"]');
            const stageChip = document.querySelector<HTMLElement>('[data-testid="mage-wars-stage-chip"]');
            const selfHud = document.querySelector<HTMLElement>('[data-testid="mage-wars-mage-hud-self"]');
            const opponentHud = document.querySelector<HTMLElement>('[data-testid="mage-wars-mage-hud-opponent"]');
            const mageHudHintCards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="mage-wars-mage-hud-hint-card"]'));
            const opponentPreparedMirror = document.querySelector<HTMLElement>('[data-testid="mage-wars-opponent-prepared-mirror"]');
            const spellbookShelf = document.querySelector<HTMLElement>('[data-testid="mage-wars-desktop-spellbook-shelf"]');
            const preparedArea = document.querySelector<HTMLElement>('[data-testid="mage-wars-desktop-prepared-spells"]');
            const preparedCard = document.querySelector<HTMLElement>('[data-testid="mage-wars-desktop-prepared-card"]');
            const spellbookCard = document.querySelector<HTMLElement>('[data-testid="mage-wars-desktop-spellbook-card"]');
            const discardPile = document.querySelector<HTMLElement>('[data-testid="mage-wars-discard-pile"]');
            const turnEnd = document.querySelector<HTMLElement>('[data-testid="mage-wars-turn-end"]');
            const arenaZones = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="mage-wars-arena-zone-"]'));
            const fieldCards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="mage-wars-zone-field-card"]'));
            const zoneMageEntities = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="mage-wars-zone-mage-entity"]'));
            const damageToken = document.querySelector<HTMLElement>('[data-testid="mage-wars-damage-token-overlay"]');
            const burnToken = document.querySelector<HTMLElement>('[data-testid="mage-wars-burn-token-overlay"]');
            const settlementOverlay = document.querySelector<HTMLElement>('[data-testid="mage-wars-desktop-settlement-overlay"]');
            const settlementAttackDice = Array.from(
                settlementOverlay?.querySelectorAll<HTMLElement>('[data-testid="mage-wars-attack-die-face"]') ?? [],
            );
            const settlementEffectDice = Array.from(
                settlementOverlay?.querySelectorAll<HTMLElement>('[data-testid="mage-wars-effect-die-face"]') ?? [],
            );
            const attackDice = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="mage-wars-attack-die-face"]'));
            const effectDice = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="mage-wars-effect-die-face"]'));
            const visibleArenaText = arenaZones.map((zone) => zone.innerText).join('\n');
            const toRect = (element: HTMLElement | null) => {
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    right: rect.right,
                    bottom: rect.bottom,
                };
            };
            const overlaps = (left: HTMLElement, right: HTMLElement) => {
                const leftRect = left.getBoundingClientRect();
                const rightRect = right.getBoundingClientRect();
                return leftRect.left < rightRect.right
                    && leftRect.right > rightRect.left
                    && leftRect.top < rightRect.bottom
                    && leftRect.bottom > rightRect.top;
            };
            const zoneMageEntityDetails = zoneMageEntities.map((occupant) => {
                const zone = occupant.closest<HTMLElement>('[data-testid^="mage-wars-arena-zone-"]');
                const rect = occupant.getBoundingClientRect();
                const zoneRect = zone?.getBoundingClientRect();
                const sameZoneFieldCards = zone
                    ? Array.from(zone.querySelectorAll<HTMLElement>('[data-testid="mage-wars-zone-field-card"]'))
                    : [];
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;

                return {
                    playerId: occupant.dataset.playerId,
                    mageId: occupant.dataset.mageId,
                    previewKind: occupant.dataset.magePreviewKind,
                    uiRole: occupant.dataset.mageUiRole,
                    rect: toRect(occupant),
                    zoneTestId: zone?.getAttribute('data-testid') ?? null,
                    centerInsideZone: zoneRect
                        ? centerX >= zoneRect.left
                            && centerX <= zoneRect.right
                            && centerY >= zoneRect.top
                            && centerY <= zoneRect.bottom
                        : false,
                    overlapsSameZoneFieldCard: sameZoneFieldCards.some((fieldCard) => overlaps(occupant, fieldCard)),
                };
            });

            return {
                viewportWidth: window.innerWidth,
                arenaStage: toRect(arenaStage),
                stageChip: toRect(stageChip),
                selfHud: toRect(selfHud),
                opponentHud: toRect(opponentHud),
                mageHudHintCards: mageHudHintCards.map((hintCard) => ({
                    rect: toRect(hintCard),
                    previewKind: hintCard.dataset.magePreviewKind,
                    uiRole: hintCard.dataset.mageUiRole,
                })),
                opponentPreparedMirror: toRect(opponentPreparedMirror),
                spellbookShelf: toRect(spellbookShelf),
                preparedArea: toRect(preparedArea),
                preparedCard: toRect(preparedCard),
                spellbookCard: toRect(spellbookCard),
                discardPile: toRect(discardPile),
                turnEnd: toRect(turnEnd),
                fieldCards: fieldCards.map(toRect),
                damageToken: toRect(damageToken),
                burnToken: toRect(burnToken),
                settlementOverlay: toRect(settlementOverlay),
                zoneMageEntities: zoneMageEntityDetails,
                settlementAttackDice: settlementAttackDice.map(toRect),
                settlementEffectDice: settlementEffectDice.map(toRect),
                attackDice: attackDice.map(toRect),
                effectDice: effectDice.map(toRect),
                visibleArenaText,
                sourceZoneCount: arenaZones.filter((zone) => zone.dataset.sourceZone === 'true').length,
                legalTargetZoneCount: arenaZones.filter((zone) => zone.dataset.legalTargetZone === 'true').length,
                legalMoveZoneCount: arenaZones.filter((zone) => zone.dataset.legalMoveZone === 'true').length,
            };
        });
        expect(desktopLayoutAudit.preparedArea).not.toBeNull();
        expect(desktopLayoutAudit.preparedCard).not.toBeNull();
        expect(desktopLayoutAudit.spellbookCard).not.toBeNull();
        expect(desktopLayoutAudit.arenaStage).not.toBeNull();
        expect(desktopLayoutAudit.stageChip).not.toBeNull();
        expect(desktopLayoutAudit.selfHud).not.toBeNull();
        expect(desktopLayoutAudit.opponentHud).not.toBeNull();
        expect(desktopLayoutAudit.mageHudHintCards).toHaveLength(2);
        expect(desktopLayoutAudit.opponentPreparedMirror).not.toBeNull();
        expect(desktopLayoutAudit.spellbookShelf).not.toBeNull();
        expect(desktopLayoutAudit.discardPile).not.toBeNull();
        expect(desktopLayoutAudit.turnEnd).not.toBeNull();
        expect(desktopLayoutAudit.settlementOverlay).not.toBeNull();
        expect(desktopLayoutAudit.settlementAttackDice).toHaveLength(4);
        expect(desktopLayoutAudit.settlementEffectDice).toHaveLength(1);
        expect(desktopLayoutAudit.attackDice.length).toBeGreaterThanOrEqual(4);
        expect(desktopLayoutAudit.effectDice.length).toBeGreaterThanOrEqual(1);
        desktopLayoutAudit.mageHudHintCards.forEach((hintCard) => {
            expect(hintCard.rect).not.toBeNull();
            expect(hintCard.rect!.height).toBeGreaterThan(150);
            expect(hintCard.rect!.width).toBeGreaterThan(100);
            expect(hintCard.previewKind).toBe('portrait');
            expect(hintCard.uiRole).toBe('player-hint-card');
        });
        expect(desktopLayoutAudit.zoneMageEntities).toHaveLength(2);
        expect(desktopLayoutAudit.zoneMageEntities.map((occupant) => occupant.mageId).sort()).toEqual([
            'priestess_apprentice',
            'warlock_apprentice',
        ]);
        desktopLayoutAudit.zoneMageEntities.forEach((occupant) => {
            expect(occupant.rect).not.toBeNull();
            expect(occupant.centerInsideZone).toBe(true);
            expect(occupant.overlapsSameZoneFieldCard).toBe(false);
            expect(occupant.previewKind).toBe('card');
            expect(occupant.uiRole).toBe('mage-battle-entity');
        });
        expect(desktopLayoutAudit.zoneMageEntities.find((occupant) => occupant.mageId === 'warlock_apprentice')?.zoneTestId).toBe('mage-wars-arena-zone-a2');
        expect(desktopLayoutAudit.zoneMageEntities.find((occupant) => occupant.mageId === 'priestess_apprentice')?.zoneTestId).toBe('mage-wars-arena-zone-b2');
        expect(desktopLayoutAudit.visibleArenaText).not.toContain('来源');
        expect(desktopLayoutAudit.visibleArenaText).not.toContain('可选目标');
        expect(desktopLayoutAudit.visibleArenaText).not.toContain('可移动');
        expect(desktopLayoutAudit.sourceZoneCount).toBe(1);
        expect(desktopLayoutAudit.legalTargetZoneCount).toBe(1);
        expect(desktopLayoutAudit.legalMoveZoneCount).toBeGreaterThan(0);
        expect(desktopLayoutAudit.preparedArea!.right).toBeLessThanOrEqual(desktopLayoutAudit.viewportWidth - 36);
        expect(desktopLayoutAudit.preparedCard!.right).toBeLessThanOrEqual(desktopLayoutAudit.viewportWidth - 44);
        expect(Math.abs(desktopLayoutAudit.arenaStage!.x - 240)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.arenaStage!.y - 30)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.arenaStage!.width - 1440)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.arenaStage!.height - 1030)).toBeLessThanOrEqual(6);
        expect(Math.abs(desktopLayoutAudit.stageChip!.x - 820)).toBeLessThanOrEqual(6);
        expect(Math.abs(desktopLayoutAudit.stageChip!.y - 16)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.stageChip!.width - 280)).toBeLessThanOrEqual(8);
        expect(Math.abs(desktopLayoutAudit.stageChip!.height - 34)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.opponentHud!.x - 1628)).toBeLessThanOrEqual(8);
        expect(Math.abs(desktopLayoutAudit.opponentHud!.y - 70)).toBeLessThanOrEqual(8);
        expect(Math.abs(desktopLayoutAudit.opponentHud!.width - 248)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.spellbookCard!.x - 374)).toBeLessThanOrEqual(8);
        expect(Math.abs(desktopLayoutAudit.spellbookCard!.y - 799)).toBeLessThanOrEqual(8);
        expect(Math.abs(desktopLayoutAudit.preparedCard!.x - 1714)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.preparedCard!.y - 745)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.discardPile!.x - 1724)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.discardPile!.y - 546)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.turnEnd!.x - 1700)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.turnEnd!.y - 1010)).toBeLessThanOrEqual(10);
        expect(Math.abs(desktopLayoutAudit.preparedCard!.height - 224)).toBeLessThanOrEqual(2);
        expect(Math.abs(desktopLayoutAudit.spellbookCard!.height - 224)).toBeLessThanOrEqual(2);
        expect(Math.abs(desktopLayoutAudit.preparedCard!.width - 158)).toBeLessThanOrEqual(2);
        expect(Math.abs(desktopLayoutAudit.spellbookCard!.width - 158)).toBeLessThanOrEqual(2);
        expect(desktopLayoutAudit.fieldCards).toHaveLength(4);
        [
            { x: 535, y: 349, width: 139, height: 191 },
            { x: 1127, y: 346, width: 139, height: 191 },
            { x: 538, y: 535, width: 139, height: 191 },
            { x: 1145, y: 536, width: 139, height: 191 },
        ].forEach((expected, index) => {
            const actual = desktopLayoutAudit.fieldCards[index];
            expect(actual).not.toBeNull();
            expect(Math.abs(actual!.x - expected.x)).toBeLessThanOrEqual(4);
            expect(Math.abs(actual!.y - expected.y)).toBeLessThanOrEqual(4);
            expect(Math.abs(actual!.width - expected.width)).toBeLessThanOrEqual(3);
            expect(Math.abs(actual!.height - expected.height)).toBeLessThanOrEqual(3);
        });
        expect(desktopLayoutAudit.damageToken).not.toBeNull();
        expect(desktopLayoutAudit.burnToken).not.toBeNull();
        expect(Math.abs(desktopLayoutAudit.damageToken!.x - 1226)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.damageToken!.y - 463)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.burnToken!.x - 1263)).toBeLessThanOrEqual(4);
        expect(Math.abs(desktopLayoutAudit.burnToken!.y - 449)).toBeLessThanOrEqual(4);

        await mkdir(dirname(SCREENSHOT_PATH), { recursive: true });
        await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });

        await assertNoFatalFrontendErrors([{ label: 'mage-wars', diagnostics }]);
    });

    test('移动横屏真实入口加载正式牌桌素材并落验收截图', async ({ context, page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width: 844, height: 390 });
        const diagnostics = await openMageWarsBoard(context, page, 'mage-wars-foundation-runtime-board-mobile');
        const imageAudit = await auditMageWarsImages(page);
        expect(imageAudit.images.some((image) => image.alt === '法师战争标准竞技场' && image.rect.width >= 800)).toBe(true);

        const layoutAudit = await page.evaluate(() => {
            const board = document.querySelector<HTMLElement>('[data-testid="mage-wars-board"]');
            const boardRect = board?.getBoundingClientRect();
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
                document: {
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: document.documentElement.scrollHeight,
                },
                board: boardRect
                    ? {
                        x: boardRect.x,
                        y: boardRect.y,
                        width: boardRect.width,
                        height: boardRect.height,
                        right: boardRect.right,
                        bottom: boardRect.bottom,
                    }
                    : null,
            };
        });
        expect(layoutAudit.board).not.toBeNull();
        expect(layoutAudit.board!.width).toBeGreaterThanOrEqual(820);
        expect(layoutAudit.board!.height).toBeGreaterThanOrEqual(370);
        expect(layoutAudit.document.scrollWidth).toBeLessThanOrEqual(layoutAudit.viewport.width + 2);

        await mkdir(dirname(MOBILE_SCREENSHOT_PATH), { recursive: true });
        await page.screenshot({ path: MOBILE_SCREENSHOT_PATH, fullPage: false });

        await assertNoFatalFrontendErrors([{ label: 'mage-wars-mobile', diagnostics }]);
    });
});
