import { test, expect } from '@playwright/test';

test('login and logout flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@fieldflow.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('text=Login');
  await expect(page).toHaveURL(/\\/$/);
  await expect(page.getByText('Your Fields')).toBeVisible();
  await page.click('text=Logout');
  await expect(page).toHaveURL(/\\/login/);
});

test('registration flow', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[name="fullName"]', 'Playwright User');
  await page.fill('input[type="email"]', `pw-${Date.now()}@example.com`);
  await page.fill('input[type="password"]', 'password123');
  await page.click('text=Create Account');
  await expect(page).toHaveURL(/\\/$/);
});
