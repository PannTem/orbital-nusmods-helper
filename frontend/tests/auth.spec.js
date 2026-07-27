import { test, expect } from '@playwright/test'
import { logout } from './helpers.js'


test('login page renders its sign-in prompt', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Sign in to continue')).toBeVisible()
})

test('a protected route redirects to /login when logged out', async ({ page }) => {
  await logout(page)              
  await page.goto('/friends')
  await expect(page).toHaveURL(/\/login/)
})

test('the timetable route also redirects when logged out', async ({ page }) => {
  await logout(page)
  await page.goto('/timetable')
  await expect(page).toHaveURL(/\/login/)
})
