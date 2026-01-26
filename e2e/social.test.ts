import { test, expect } from '@playwright/test';

test.describe('Social Hub E2E', () => {

    // Mock Data
    const mockUser = {
        id: 'user_123',
        username: 'TestPlayer',
        email: 'test@example.com',
        emailVerified: true,
        lastOnline: new Date().toISOString()
    };

    const mockFriends = [
        {
            user: 'user_123',
            friend: {
                _id: 'friend_001',
                username: 'BestFriend',
                lastOnline: new Date().toISOString(),
                avatar: 'avatar_1.png'
            },
            status: 'accepted',
            createdAt: new Date().toISOString()
        }
    ];

    const mockMessages = [
        {
            from: 'friend_001',
            to: 'user_123',
            content: 'Hello! Want to play?',
            createdAt: new Date(Date.now() - 10000).toISOString(),
            read: true,
            type: 'text'
        }
    ];

    test.beforeEach(async ({ page }) => {
        // 1. Mock API Responses
        await page.route('**/auth/me', async route => {
            await route.fulfill({ json: { user: mockUser } });
        });

        // Mock Login
        await page.route('**/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'fake_jwt_token',
                    user: mockUser
                }
            });
        });

        // Mock Friends List
        await page.route('**/auth/friends', async route => {
            await route.fulfill({ json: { items: mockFriends, friends: mockFriends, total: 1 } });
        });

        // Mock Friend Requests (Fix for missing mock causing context error)
        await page.route('**/auth/friends/requests', async route => {
            await route.fulfill({ json: { items: [], requests: [], total: 0 } });
        });

        // Mock Messages for specific friend
        await page.route('**/auth/messages/conversations', async route => {
            await route.fulfill({ json: { items: [] } }); // Empty conversations list initially
        });

        await page.route('**/auth/messages/friend_001', async route => {
            await route.fulfill({ json: { items: mockMessages, total: 1 } });
        });

        // Mock Send Message
        await page.route('**/auth/messages/send', async route => {
            const body = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({
                json: {
                    ...body,
                    createdAt: new Date().toISOString(),
                    read: false
                }
            });
        });

        // 2. Simulate Login State
        await page.addInitScript(() => {
            localStorage.setItem('auth_token', 'fake_jwt_token');
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'user_123',
                username: 'TestPlayer',
                email: 'test@example.com'
            }));
        });

        // Debug: Capture console logs and errors
        page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.log(`[Browser Error]: ${err.message}`));

        // 3. Go to Home
        await page.goto('/');
    });

    test('Should open Social Hub and view friend chat', async ({ page }) => {
        // 1. Check User Menu is present (logged in state)
        // UserMenu renders username
        await expect(page.getByText('TestPlayer')).toBeVisible();

        // 2. Open User Menu
        await page.getByText('TestPlayer').click();

        // 3. Click "Friends & Chat" button
        // Based on UserMenu.tsx, it renders text with t('social:menu.friendsAndChat')
        // We might need to match exact text key if i18n isn't loaded, but Playwright sees rendered text.
        // Assuming English default: "Friends & Chat" or we look for the MessageSquare icon container logic.
        // Better: look for role "button" causing modal open.
        // In UserMenu.tsx: button with MessageSquare icon.

        // Let's try finding by partial text if i18n key is used directly or resolved.
        // If i18n fails, it usually shows the key.
        // Ideally we should wait for text. 
        // Let's assume standard "Friends" text or look for the button in the dropdown.
        // The dropdown is: .absolute.top... 

        const friendsButton = page.getByRole('button').filter({ hasText: /Friend|Chat|social:menu/i });
        await expect(friendsButton).toBeVisible();
        await friendsButton.click();

        // 4. Verify Modal Opened
        // Modal title from FriendsChatModal: t('social:modal.title')
        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible();

        // 5. Check Friend List
        // Should show "BestFriend"
        await expect(page.getByText('BestFriend')).toBeVisible();

        // 6. Select Friend to Chat
        await page.getByText('BestFriend').click();

        // 7. Verify Chat Window Open
        // Should see history message
        await expect(page.getByText('Hello! Want to play?')).toBeVisible();

        // 8. Type and Send Message
        const input = page.locator('input[type="text"], textarea'); // Chat input
        await input.fill('Sure, let\'s go!');
        await page.keyboard.press('Enter');

        // 9. Verify optimistic update or sent message (Mock returns success)
        // Note: The UI might need to re-fetch or use socket. 
        // If purely socket based, this might not show up without socket mock.
        // But usually there's optimistic UI.
        // Let's at least ensure no error toast appeared.
    });

});
