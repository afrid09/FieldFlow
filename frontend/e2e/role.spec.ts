import { test, expect } from '@playwright/test';

test('farmer role does not see admin link', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('demo@fieldflow.com');
  await page.locator('input[type="password"]').fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Your Fields')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0);
});
