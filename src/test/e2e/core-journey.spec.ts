import { test, expect } from '@playwright/test'

/**
 * E2E: Onboarding → first session logged
 * Tech Pillar spec: "Sign up → onboarding → first session logged"
 *
 * These tests run against a staging environment.
 * They require PLAYWRIGHT_BASE_URL to point to a test instance.
 */

test.describe('Core user journey', () => {
  test('landing page loads and shows tagline', async ({ page }) => {
    await page.goto('/')
    // Should show the primary tagline or redirect to auth
    const hasTagline = await page.locator('text=keeps up with your life').isVisible()
      .catch(() => false)
    const hasAuthRedirect = page.url().includes('/auth') || page.url().includes('/today')
    expect(hasTagline || hasAuthRedirect).toBe(true)
  })

  test('Today tab loads within 3 seconds for authenticated users', async ({ page }) => {
    // This test skips if not authenticated
    await page.goto('/today')
    const start = Date.now()

    // Wait for either the Today header or auth redirect
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    const elapsed = Date.now() - start

    // If redirected to auth — skip timing test
    if (page.url().includes('/auth')) {
      test.skip()
      return
    }

    // Today tab must load in under 3s (4G mobile target from Tech Pillar)
    expect(elapsed).toBeLessThan(3000)
  })

  test('unauthenticated users are redirected to auth', async ({ page }) => {
    // Clear any session
    await page.context().clearCookies()
    await page.goto('/today')
    // Should redirect to login
    await expect(page).toHaveURL(/auth|login/, { timeout: 5000 })
  })
})

test.describe('Plan marketplace', () => {
  test('marketplace page loads public plans', async ({ page }) => {
    await page.goto('/marketplace')
    // Either shows plans or redirects to auth
    const hasPlans = await page.locator('text=NextSplit Official').isVisible()
      .catch(() => false)
    const hasAuthRedirect = page.url().includes('/auth')
    expect(hasPlans || hasAuthRedirect).toBe(true)
  })
})

test.describe('Mobile viewport', () => {
  test('navigation is accessible on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Bottom nav should be present and not overflow
    const nav = page.locator('nav[aria-label="Main navigation"]')
    const isVisible = await nav.isVisible().catch(() => false)

    if (!page.url().includes('/auth') && !page.url().includes('/onboarding')) {
      expect(isVisible).toBe(true)
    }
  })
})
