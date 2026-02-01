import { test, expect } from '@playwright/test';

test('farmer role does not see admin link', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@fieldflow.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('text=Login');
  await expect(page).toHaveURL(/\\/$/);
  await expect(page.getByText('Admin')).toHaveCount(0);
});
