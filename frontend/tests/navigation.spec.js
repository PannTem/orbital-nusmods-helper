import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Rendering and navigation  of pages behind login

test('home page loads when logged in (no redirect)', async ({ page }) => {
  await loginAs(page)
  await page.goto('/')
  await expect(page).not.toHaveURL(/\/login/)
})

test('navbar navigates to the timetable builder', async ({ page }) => {
  await loginAs(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Timetable', exact: true }).click()
  await expect(page).toHaveURL(/\/timetable/)
  await expect(page.getByRole('heading', { name: 'Timetable Builder' })).toBeVisible()
})

test('friends page renders its heading and empty state', async ({ page }) => {
  await loginAs(page)
  await page.goto('/friends')
  await expect(page.getByRole('heading', { name: 'Friends' })).toBeVisible()
  //expect empty state because test acc has no friends
  await expect(page.getByText('No friends yet. Search above to add some.')).toBeVisible()
})
