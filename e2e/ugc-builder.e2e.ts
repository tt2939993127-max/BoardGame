/**
 * UGC Builder E2E 测试
 * 
 * 测试 Builder 页面的核心功能
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const dismissViteOverlay = async (page: Page) => {
    await page.evaluate(() => {
        const overlay = document.querySelector('vite-error-overlay');
        if (overlay) overlay.remove();
    });
};

const DRAFT_STORAGE_KEY = 'ugc-builder-state';
const DRAFT_FIXTURE = JSON.parse(
    fs.readFileSync(new URL('../docs/ugc/doudizhu-preview.ugc.json', import.meta.url), 'utf-8')
);

const seedDraftState = async (page: Page) => {
    await page.evaluate(([key, payload]) => {
        localStorage.setItem(key, JSON.stringify(payload));
    }, [DRAFT_STORAGE_KEY, DRAFT_FIXTURE]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
};

const gotoUGC = async (page: Page) => {
    await page.goto('/dev/ugc', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('UGC Builder')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 15000 });
    await dismissViteOverlay(page);
};

const pasteText = async (page: Page, selector: string, text: string) => {
    await page.locator(selector).click();
    await page.locator(selector).evaluate((element, value) => {
        const data = new DataTransfer();
        data.setData('text/plain', value as string);
        const event = new ClipboardEvent('paste', {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    }, text);
};

type BuilderProjectPayload = {
    name?: string;
    description?: string;
    data?: Record<string, unknown> | null;
};

test.describe('UGC Builder', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            if (!sessionStorage.getItem('ugc_builder_e2e_cleared')) {
                localStorage.clear();
                sessionStorage.setItem('ugc_builder_e2e_cleared', '1');
            }
        });
        await gotoUGC(page);
    });

    test.describe('页面加载', () => {
        test('应正确加载 Builder 页面', async ({ page }) => {
            await gotoUGC(page);
            
            // 检查页面标题元素
            await expect(page.locator('input[placeholder*="游戏名称"]')).toBeVisible();
            
            // 检查工具栏按钮
            await expect(page.getByText('保存')).toBeVisible();
            await expect(page.getByText('导入')).toBeVisible();
            await expect(page.getByText('导出')).toBeVisible();
            await expect(page.getByText('清空')).toBeVisible();
        });
    });

    test.describe('Schema 管理', () => {
        test('应能创建新 Schema', async ({ page }) => {
            await gotoUGC(page);
            
            // 点击添加 Schema 按钮
            await page.getByText('+ Schema').click();
            
            // 选择模板
            await page.getByText('空模板').click();
            
            // 验证 Schema 已创建
            await expect(page.locator('[data-testid="schema-item"]').first()).toBeVisible({ timeout: 5000 });
        });

        test('应能编辑 Schema 名称', async ({ page }) => {
            await gotoUGC(page);
            
            // 创建 Schema
            await page.getByText('+ Schema').click();
            await page.getByText('空模板').click();
            
            // 直接在 Schema 编辑弹窗内修改名称（创建后默认打开）
            await expect(page.getByRole('heading', { name: 'Schema 编辑' })).toBeVisible();
            const nameInput = page
                .locator('label:has-text("名称")')
                .first()
                .locator('..')
                .locator('input');
            await nameInput.fill('测试 Schema');
        });
    });

    test.describe('保存/加载', () => {
        test('保存后刷新应恢复数据', async ({ page }) => {
            await gotoUGC(page);
            
            // 修改游戏名称
            const nameInput = page.locator('input[placeholder*="游戏名称"]');
            await nameInput.fill('测试游戏');
            
            // 点击保存
            await page.getByText('保存').click();

            const saved = await page.evaluate(() => localStorage.getItem('ugc-builder-state'));
            expect(saved).toBeTruthy();
            const parsed = saved ? JSON.parse(saved) : null;
            expect(parsed?.name).toBe('测试游戏');
            
            // 刷新页面
            await page.reload();
            
            // 验证数据恢复
            await expect(nameInput).toHaveValue('测试游戏');
        });

        test('清空按钮应重置所有数据', async ({ page }) => {
            await gotoUGC(page);
            
            // 修改游戏名称
            const nameInput = page.locator('input[placeholder*="游戏名称"]');
            await nameInput.fill('测试游戏');
            
            // 保存
            page.on('dialog', async dialog => {
                if (dialog.type() === 'confirm') {
                    await dialog.accept();
                } else {
                    await dialog.accept();
                }
            });
            await page.getByText('保存').click();
            
            // 点击清空
            await page.getByText('清空').click();
            
            // 验证数据已清空
            await expect(nameInput).toHaveValue('新游戏');
        });
    });

    test.describe('云端草稿', () => {
        test('未登录时打开草稿列表应提示登录', async ({ page }) => {
            await gotoUGC(page);

            await page.getByRole('button', { name: '草稿' }).click();
            await expect(page.getByText('请先登录后管理草稿。')).toBeVisible();
        });

        test('登录后展示草稿列表', async ({ page }) => {
            await gotoUGC(page);

            await page.evaluate(() => {
                localStorage.setItem('auth_token', 'fake_jwt_token');
                localStorage.setItem('auth_user', JSON.stringify({
                    id: 'user_123',
                    username: '测试用户',
                    role: 'user',
                    banned: false,
                }));
            });

            await page.reload({ waitUntil: 'domcontentloaded' });
            await dismissViteOverlay(page);

            await page.route('**/ugc/builder/projects', async route => {
                if (route.request().method() !== 'GET') {
                    await route.fallback();
                    return;
                }
                await route.fulfill({
                    status: 200,
                    json: {
                        items: [
                            {
                                projectId: 'project_1',
                                name: '云端草稿A',
                                description: '测试草稿',
                                updatedAt: new Date().toISOString(),
                            },
                        ],
                    },
                });
            });

            await page.getByRole('button', { name: '草稿' }).click();
            await expect(page.getByText('云端草稿A')).toBeVisible();
            await expect(page.getByText(/共 1 个草稿/)).toBeVisible();
        });

        test('登录后可创建并更新云端草稿', async ({ page }) => {
            await gotoUGC(page);

            await page.evaluate(() => {
                localStorage.setItem('auth_token', 'fake_jwt_token');
                localStorage.setItem('auth_user', JSON.stringify({
                    id: 'user_123',
                    username: '测试用户',
                    role: 'user',
                    banned: false,
                }));
            });

            await page.reload({ waitUntil: 'domcontentloaded' });
            await dismissViteOverlay(page);

            let createPayload: BuilderProjectPayload | null = null;
            let updatePayload: BuilderProjectPayload | null = null;

            await page.route('**/ugc/builder/projects', async route => {
                const request = route.request();
                if (request.method() === 'POST') {
                    createPayload = request.postDataJSON() as BuilderProjectPayload;
                    await route.fulfill({
                        status: 201,
                        json: {
                            projectId: 'project_100',
                            name: createPayload?.name ?? '云端草稿A',
                            description: createPayload?.description ?? '',
                            updatedAt: new Date().toISOString(),
                            data: createPayload?.data ?? null,
                        },
                    });
                    return;
                }
                if (request.method() === 'GET') {
                    await route.fulfill({ status: 200, json: { items: [] } });
                    return;
                }
                await route.fallback();
            });

            await page.route('**/ugc/builder/projects/*', async route => {
                const request = route.request();
                if (request.method() === 'PUT') {
                    updatePayload = request.postDataJSON() as BuilderProjectPayload;
                    await route.fulfill({
                        status: 200,
                        json: {
                            projectId: 'project_100',
                            name: updatePayload?.name ?? '云端草稿A',
                            description: updatePayload?.description ?? '',
                            updatedAt: new Date().toISOString(),
                            data: updatePayload?.data ?? null,
                        },
                    });
                    return;
                }
                await route.fallback();
            });

            const nameInput = page.locator('input[placeholder*="游戏名称"]');
            await nameInput.fill('云端草稿A');
            await page.getByText('保存').click();

            await expect.poll(() => createPayload).not.toBeNull();
            expect(createPayload).toMatchObject({ name: '云端草稿A' });
            await expect(page.getByText(/当前草稿：云端草稿A/)).toBeVisible();

            await nameInput.fill('云端草稿A-更新');
            await page.getByText('保存').click();

            await expect.poll(() => updatePayload).not.toBeNull();
            expect(updatePayload).toMatchObject({ name: '云端草稿A-更新' });
        });

        test('草稿列表支持打开与删除', async ({ page }) => {
            await gotoUGC(page);

            await page.evaluate(() => {
                localStorage.setItem('auth_token', 'fake_jwt_token');
                localStorage.setItem('auth_user', JSON.stringify({
                    id: 'user_123',
                    username: '测试用户',
                    role: 'user',
                    banned: false,
                }));
            });

            await page.reload({ waitUntil: 'domcontentloaded' });
            await dismissViteOverlay(page);

            let projects = [
                {
                    projectId: 'project_open',
                    name: '可加载草稿',
                    description: '用于加载',
                    updatedAt: new Date().toISOString(),
                },
                {
                    projectId: 'project_delete',
                    name: '待删除草稿',
                    description: '用于删除',
                    updatedAt: new Date().toISOString(),
                },
            ];

            await page.route('**/ugc/builder/projects', async route => {
                const request = route.request();
                if (request.method() === 'GET') {
                    await route.fulfill({ status: 200, json: { items: projects } });
                    return;
                }
                await route.fallback();
            });

            await page.route('**/ugc/builder/projects/*', async route => {
                const request = route.request();
                if (request.method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        json: {
                            projectId: 'project_open',
                            name: '可加载草稿',
                            description: '用于加载',
                            updatedAt: new Date().toISOString(),
                            data: { name: '已加载游戏' },
                        },
                    });
                    return;
                }
                if (request.method() === 'DELETE') {
                    projects = projects.filter(project => project.projectId !== 'project_delete');
                    await route.fulfill({ status: 200, json: { deleted: true } });
                    return;
                }
                await route.fallback();
            });

            await page.getByRole('button', { name: '草稿' }).click();
            await expect(page.getByText('可加载草稿')).toBeVisible();
            const projectModal = page.getByRole('heading', { name: '云端草稿' }).locator('..').locator('..');
            await projectModal.getByRole('button', { name: '打开' }).first().click();
            await expect(page.getByRole('heading', { name: '云端草稿' })).toBeHidden({ timeout: 15000 });

            const nameInput = page.locator('input[placeholder*="游戏名称"]');
            await expect.poll(async () => nameInput.inputValue()).toBe('已加载游戏');

            const stored = await page.evaluate(() => localStorage.getItem('ugc-builder-state'));
            expect(stored).toBeTruthy();

            await page.getByRole('button', { name: '草稿' }).click();
            page.once('dialog', async dialog => {
                await dialog.accept();
            });
            const deleteButtons = page.getByRole('button', { name: '删除' });
            await deleteButtons.nth(1).click();
            await expect.poll(() => projects.length).toBe(1);
            await expect(page.getByText('待删除草稿')).toBeHidden();
        });
    });

    test.describe('标签管理', () => {
        test('应能打开标签管理模态框', async ({ page }) => {
            await gotoUGC(page);
            
            // 创建 Schema
            await page.getByText('+ Schema').click();
            await page.getByText('空模板').click();
            
            // 直接在 Schema 编辑弹窗内打开标签管理（创建后默认打开）
            await expect(page.getByRole('heading', { name: 'Schema 编辑' })).toBeVisible();
            await page.getByRole('button', { name: '管理标签' }).click();
            
            // 验证模态框打开
            await expect(page.getByText('标签管理')).toBeVisible();
        });

        test('应能添加新标签', async ({ page }) => {
            await gotoUGC(page);
            
            // 创建 Schema
            await page.getByText('+ Schema').click();
            await page.getByText('空模板').click();
            
            // 直接在 Schema 编辑弹窗内打开标签管理（创建后默认打开）
            await expect(page.getByRole('heading', { name: 'Schema 编辑' })).toBeVisible();
            await page.getByRole('button', { name: '管理标签' }).click();
            
            // 填写标签名称
            await page
                .locator('label:has-text("标签名称")')
                .first()
                .locator('..')
                .locator('input')
                .fill('测试标签');
            
            // 点击添加
            await page.getByRole('button', { name: '添加' }).click();
            
            // 验证标签已添加
            await expect(page.getByText('测试标签')).toBeVisible();
        });
    });

    test.describe('需求驱动流程', () => {
        test('需求应进入批量生成提示词并可进入预览', async ({ page }) => {
            await gotoUGC(page);

            await page.getByText('+ Schema').click();
            await page.getByText('空模板').click();
            await expect(page.getByRole('heading', { name: 'Schema 编辑' })).toBeVisible();
            await page.getByRole('heading', { name: 'Schema 编辑' }).locator('..').locator('button').click();

            await page.getByText('生成规则').click();
            await page.getByPlaceholder('描述胜利条件、回合流程、特殊规则等').fill('总体需求A');
            await page.getByText('+ 添加条目').click();
            await page.getByPlaceholder('需求位置（如：手牌区/排序）').fill('区域A');
            await page.getByPlaceholder('需求内容').fill('需要显示资源');
            await page.getByRole('heading', { name: 'AI 规则生成' }).locator('..').locator('button').click();

            await page.getByRole('button', { name: 'AI生成' }).first().click();
            await expect(page.getByRole('heading', { name: 'AI 批量生成' })).toBeVisible();
            await page.getByText('批量数据').click();
            await page.getByPlaceholder('输入你的需求描述...').fill('生成基础实体');

            const prompt = page.locator('pre').filter({ hasText: '总体需求：总体需求A' }).first();
            await expect(prompt).toContainText('结构化需求');
            await expect(prompt).toContainText('区域A');
            await expect(prompt).toContainText('数据库 AI 生成');
            await expect(prompt).toContainText('生成基础实体');

            await page.getByRole('heading', { name: 'AI 批量生成' }).locator('..').locator('button').click();
            await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible();
            await page.getByRole('heading', { name: '数据管理' }).locator('..').locator('button').click();
            await expect(page.getByRole('heading', { name: '数据管理' })).toBeHidden();

            await page.getByText('预览').click();
            await expect(page.getByRole('button', { name: '查看背面' })).toBeVisible();
        });

        test('草稿预览运行态应正常渲染', async ({ page }, testInfo) => {
            await gotoUGC(page);
            await seedDraftState(page);

            await page.getByText('预览').click();
            await expect(page.locator('[data-hand-area="root"]').first()).toBeVisible({ timeout: 15000 });

            const screenshotPath = path.resolve('screenshots', 'ugc-builder-preview.png');
            fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
            await page.screenshot({ path: screenshotPath, fullPage: true });
        });
    });

    test.describe('试玩沙盒', () => {
        test('打开试玩应进入沙盒并加载运行态', async ({ page }) => {
            await gotoUGC(page);
            await seedDraftState(page);

            await page.getByRole('button', { name: '打开试玩' }).click();
            await expect(page).toHaveURL(/\/dev\/ugc\/sandbox/);
            await expect(page.getByText('UGC 试玩/沙盒')).toBeVisible();
            await expect(page.getByRole('button', { name: '返回 Builder' })).toBeVisible();

            const iframe = page.frameLocator('iframe[title="UGC Remote Host ugc-builder-sandbox"]');
            await expect(iframe.locator('[data-hand-area="root"]').first()).toBeVisible({ timeout: 15000 });

            const screenshotPath = path.resolve('screenshots', 'ugc-sandbox.png');
            fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
            await page.screenshot({ path: screenshotPath, fullPage: true });
        });

        test('点击卡牌应标记选中状态', async ({ page }) => {
            await gotoUGC(page);
            await seedDraftState(page);

            await page.getByRole('button', { name: '打开试玩' }).click();
            const iframe = page.frameLocator('iframe[title="UGC Remote Host ugc-builder-sandbox"]');
            const card = iframe.locator('[data-component-id="hand-bottom"] [data-card-id]').last();
            await expect(card).toBeVisible({ timeout: 15000 });

            await card.click({ force: true });
            await expect(card).toHaveAttribute('data-is-selected', 'true');
        });

        test('点击选中后出牌按钮应触发命令提示', async ({ page }) => {
            await gotoUGC(page);
            await seedDraftState(page);

            await page.getByRole('button', { name: '打开试玩' }).click();
            const iframe = page.frameLocator('iframe[title="UGC Remote Host ugc-builder-sandbox"]');
            const card = iframe.locator('[data-component-id="hand-bottom"] [data-card-id]').last();
            await expect(card).toBeVisible({ timeout: 15000 });
            await card.click({ force: true });
            await expect(card).toHaveAttribute('data-is-selected', 'true');
            const actionButton = iframe.getByRole('button', { name: '出牌' }).first();
            await expect(actionButton).toBeVisible({ timeout: 15000 });

            await actionButton.click();
            await expect(iframe.getByText(/命令已发送|命令执行成功|命令执行失败/)).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('布局组件', () => {
        test('应能拖拽组件到画布', async ({ page }) => {
            await gotoUGC(page);
            
            // 找到手牌区组件
            const handZone = page.getByText('手牌区');
            
            // 找到画布区域
            const canvas = page.locator('[data-testid="layout-canvas"]');
            
            // 如果有画布，尝试拖拽
            if (await canvas.count() > 0) {
                await handZone.dragTo(canvas);
            }
        });
    });
});
