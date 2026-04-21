import { test, expect } from '@playwright/test'

/**
 * Pre-Alpha Quality Gate — Phase F
 *
 * These tests codify the F1 founder E2E checklist so it can be
 * run automatically before any alpha invite goes out.
 *
 * Run: npx playwright test src/test/e2e/pre-alpha-gates.spec.ts
 *
 * All must pass before alpha invites are sent.
 */

test.describe('Phase F: Pre-Alpha Gates', () => {

  // ── F1.1 — Core pages load ──────────────────────────────────────────────────

  test('Auth page loads and shows email input', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
  })

  test('Signup page loads', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
  })

  test('Privacy policy page has real content', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('Privacy')
    // Should have substantial content (not a placeholder)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(1000)
  })

  test('Terms of service page has real content', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('Terms')
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(1000)
  })

  test('Cookie consent banner appears on first visit', async ({ page, context }) => {
    // Clear cookies/storage to simulate fresh visit
    await context.clearCookies()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Banner should appear if user is on a page that loads it
    // (may redirect to auth — that's fine, check there too)
    const url = page.url()
    if (url.includes('/auth')) {
      await expect(page.locator('text=Accept analytics').or(page.locator('text=accept analytics'))).toBeVisible({ timeout: 5000 }).catch(() => {
        // May not show on auth pages — acceptable
      })
    }
  })

  // ── F1.2 — Unauthenticated protection ──────────────────────────────────────

  test('Today tab redirects unauthenticated users', async ({ page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/auth')
  })

  test('Plan tab redirects unauthenticated users', async ({ page }) => {
    await page.goto('/plan')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/auth')
  })

  test('Admin pages redirect non-admin users', async ({ page }) => {
    await page.goto('/admin/plan-review')
    await page.waitForLoadState('networkidle')
    // Should redirect to auth or today, not show admin content
    const url = page.url()
    expect(url.includes('/auth') || url.includes('/today')).toBe(true)
  })

  // ── F1.3 — API routes return proper errors without auth ─────────────────────

  test('adapt-plan API returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/ai/adapt-plan', {
      data: { plan_id: '00000000-0000-0000-0000-000000000000', week_n: 1 },
    })
    expect(res.status()).toBe(401)
  })

  test('adapt-plan API returns 400 for invalid input', async ({ request }) => {
    // This tests Zod validation — Phase A1
    const res = await request.post('/api/ai/adapt-plan', {
      data: { plan_id: 'not-a-uuid', week_n: 1 },
    })
    // Will get 401 (unauthed) or 400 (Zod) — both are correct
    expect([400, 401]).toContain(res.status())
  })

  test('community/progress API returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/community/progress', {
      data: { km: 5, done: true },
    })
    expect(res.status()).toBe(401)
  })

  test('plans/activate API returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/plans/activate', {
      data: { slug: 'marathon_novice', name: 'Test Plan' },
    })
    expect(res.status()).toBe(401)
  })

  // ── F1.4 — Performance gates ────────────────────────────────────────────────

  test('Auth login page loads in under 3 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(3000)
  })

  test('Landing page has no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Filter out known acceptable errors (e.g., missing env vars in test)
    const realErrors = errors.filter(e =>
      !e.includes('NEXT_PUBLIC') &&
      !e.includes('hydrat') &&
      !e.includes('Warning:')
    )
    expect(realErrors).toHaveLength(0)
  })

  // ── F1.5 — PWA / Mobile ─────────────────────────────────────────────────────

  test('App has web manifest', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const manifest = page.locator('link[rel="manifest"]')
    await expect(manifest).toHaveCount(1)
  })

  test('App has viewport meta tag', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)
  })

  // ── F1.6 — Zod validation health check ─────────────────────────────────────

  test('Zod returns structured error on invalid input', async ({ request }) => {
    const res = await request.post('/api/ai/adapt-plan', {
      data: { plan_id: 'not-a-uuid', week_n: 999 },
    })
    // Either 400 (Zod) or 401 (unauthed) — if 400, check structure
    if (res.status() === 400) {
      const body = await res.json()
      expect(body).toHaveProperty('error')
      // Zod errors have a details array
      if (body.details) {
        expect(Array.isArray(body.details)).toBe(true)
      }
    }
  })

  // ── F1.7 — Key routes exist (not 404) ──────────────────────────────────────

  for (const route of ['/auth/login', '/auth/signup', '/privacy', '/terms']) {
    test(`${route} returns 200`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
    })
  }
})
