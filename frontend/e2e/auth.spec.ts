import { test, expect } from '@playwright/test';

test('login and logout flow', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('demo@fieldflow.com');
  await page.locator('input[type="password"]').fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Your Fields')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('registration flow', async ({ page }) => {
  await page.goto('/register');
  await page.locator('#fullName').fill('Playwright User');
  await page.locator('#email').fill(`pw-${Date.now()}@example.com`);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/$/);
});
