import type { Page } from '@playwright/test';
import { expect } from '../framework';

type JsonRecord = Record<string, any>;
type ReadGameState = () => Promise<JsonRecord>;

type RightTrayBonusDiceOptions = {
    sourceAbilityId: string;
};

const readPendingBonusSettlement = async (readState: ReadGameState) => {
    const state = await readState();
    return state?.core?.pendingBonusDiceSettlement ?? state?.G?.core?.pendingBonusDiceSettlement ?? null;
};

const rightTrayRail = (page: Page) => {
    const diceTray = page.locator('[data-testid="dicethrone-2d-dice-tray"]:visible').first();
    return {
        diceTray,
        rail: diceTray.locator('xpath=ancestor::*[@data-player-seat-anchor][1]'),
    };
};

/**
 * 返回当前页面真实可见的右侧 2D 骰盘。
 * 奖励骰的所有者由页面视角决定，调用方不应再用领域 playerId 猜 DOM 容器。
 */
export const getRightTrayDiceTray = (page: Page) => rightTrayRail(page).diceTray;

export const getRightTrayDie = (page: Page, dieId: number | string) => (
    getRightTrayDiceTray(page).locator(`[data-testid="die-button-${dieId}"]`).first()
);

/**
 * 奖励骰只能由右侧 2D 骰盘确认。这里仅承接所有来源共有的 UI 生命周期；
 * 调用方仍负责断言各自的改骰、伤害、资源、目标和阶段结果。
 */
export const expectRightTrayBonusDiceConfirmation = async (
    page: Page,
    readState: ReadGameState,
    { sourceAbilityId }: RightTrayBonusDiceOptions,
): Promise<void> => {
    await expect.poll(async () => {
        const settlement = await readPendingBonusSettlement(readState);
        return settlement?.sourceAbilityId ?? null;
    }, { timeout: 10000 }).toBe(sourceAbilityId);

    const { diceTray, rail } = rightTrayRail(page);
    const confirmButton = rail.locator('[data-tutorial-id="dice-confirm-button"]').first();
    await expect(page.getByTestId('bonus-die-overlay')).toHaveCount(0);
    await expect(page.getByTestId('bonus-dice-confirm-button')).toHaveCount(0);
    await expect(diceTray).toBeVisible({ timeout: 10000 });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await expect(confirmButton).toBeEnabled();
    await expect(confirmButton).toHaveText(/^(确认|Confirm)$/);
};

/**
 * 奖励骰尚在他方响应窗口时，骰盘仍可见，但投掷者的普通确认入口必须保持隐藏。
 * 这是响应窗口自身的公共 UI 合同；对象用例只保留其改骰和最终结算结果。
 */
export const expectRightTrayBonusDiceAwaitingResponse = async (
    page: Page,
    readState: ReadGameState,
    { sourceAbilityId }: RightTrayBonusDiceOptions,
): Promise<void> => {
    await expect.poll(async () => {
        const settlement = await readPendingBonusSettlement(readState);
        return settlement?.sourceAbilityId ?? null;
    }, { timeout: 10000 }).toBe(sourceAbilityId);

    const { diceTray, rail } = rightTrayRail(page);
    await expect(page.getByTestId('bonus-die-overlay')).toHaveCount(0);
    await expect(page.getByTestId('bonus-dice-confirm-button')).toHaveCount(0);
    await expect(diceTray).toBeVisible({ timeout: 10000 });
    await expect(rail.locator('[data-tutorial-id="dice-confirm-button"]')).toHaveCount(0);
};

/**
 * 走完当前临时骰的正式玩家入口。
 *
 * 卡牌/技能 E2E 只声明“哪一个效果已产生临时骰”和“收口后的专属结果”；
 * 右侧骰盘、确认按钮和 pending 清理由这里统一承接。流程 UI 变更时只改这里
 * 及专门的临时骰生命周期 E2E，不复制到每个效果用例。
 */
export const settleCurrentBonusDice = async (
    page: Page,
    readState: ReadGameState,
    options: RightTrayBonusDiceOptions,
): Promise<void> => {
    await expectRightTrayBonusDiceConfirmation(page, readState, options);
    const { rail } = rightTrayRail(page);
    const confirmButton = rail.locator('[data-tutorial-id="dice-confirm-button"]').first();
    await confirmButton.click();

    await expect.poll(async () => {
        return readPendingBonusSettlement(readState);
    }, { timeout: 10000 }).toBeNull();
};
