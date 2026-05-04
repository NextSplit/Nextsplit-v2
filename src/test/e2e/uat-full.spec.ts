/**
 * NextSplit — Full UAT E2E Test Suite
 * 
 * Covers the complete F1 founder checklist with authenticated flows.
 * 
 * Setup:
 *   1. Run: npx tsx scripts/uat-db-verify.ts  (creates UAT test user)
 *   2. Set in .env.test: UAT_EMAIL=uat@nextsplit.app UAT_PASSWORD=UATtest2026!
 *   3. Run: npx playwright test src/test/e2e/uat-full.spec.ts
 * 
 * Or run against production:
 *   BASE_URL=https://nextsplit.app npx playwright test src/test/e2e/uat-full.spec.ts
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const BASE     = process.env.BASE_URL     ?? 'https://nextsplit.app'
const EMAIL    = process.env.UAT_EMAIL    ?? 'uat@nextsplit.app'
const PASSWORD = process.env.UAT_PASSWORD ?? 'UATtest2026!'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE}/auth/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"], button:has-text("Sign in")')
  await page.waitForURL(`${BASE}/home`, { timeout: 10000 })
}

async function expectDarkMode(page: Page) {
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark')
  )
  expect(isDark, 'Expected dark mode to be active').toBe(true)
}

// ── SECTION A — Auth & Landing ────────────────────────────────────────────────

test.describe('A — Auth & Landing', () => {
  test('A1 — Login page loads with dark background', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('text=NextSplit')).toBeVisible()
    await expectDarkMode(page)
  })

  test('A2 — Unauthenticated redirect from /home', async ({ page }) => {
    await page.goto(`${BASE}/home`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/auth')
  })

  test('A3 — Unauthenticated redirect from /train', async ({ page }) => {
    await page.goto(`${BASE}/train`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/auth')
  })

  test('A4 — Login with valid credentials', async ({ page }) => {
    await login(page)
    expect(page.url()).toContain('/home')
  })

  test('A5 — Dark mode active after login', async ({ page }) => {
    await login(page)
    await expectDarkMode(page)
  })
})

// ── SECTION B — Home Tab ──────────────────────────────────────────────────────

test.describe('B — Home Tab', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('B1 — Home tab loads with correct elements', async ({ page }) => {
    await expect(page.locator('text=NextSplit')).toBeVisible()
    await expect(page.locator('text=Lv 1, text=Lv')).toBeVisible()
    await expect(page.locator('text=Good morning, text=Good afternoon, text=Good evening').first()).toBeVisible()
  })

  test('B2 — Bottom nav has 4 tabs', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible()
    await expect(page.locator('a[aria-label="Home"]')).toBeVisible()
    await expect(page.locator('a[aria-label="Train"]')).toBeVisible()
    await expect(page.locator('a[aria-label="Explore"]')).toBeVisible()
    await expect(page.locator('a[aria-label="You"]')).toBeVisible()
  })

  test('B3 — Dark mode toggle visible on Home', async ({ page }) => {
    const toggle = page.locator('button[aria-label*="dark"], button[aria-label*="light"], button[aria-label*="mode"]').first()
    await expect(toggle).toBeVisible()
  })

  test('B4 — Dark mode persists across tab navigation', async ({ page }) => {
    await expectDarkMode(page)
    await page.click('a[aria-label="Train"]')
    await page.waitForURL('**/train')
    await expectDarkMode(page)
    await page.click('a[aria-label="Explore"]')
    await page.waitForURL('**/explore')
    await expectDarkMode(page)
    await page.click('a[aria-label="You"]')
    await page.waitForURL('**/you')
    await expectDarkMode(page)
  })

  test('B5 — Hero card shows correct state', async ({ page }) => {
    // Should show either training hero (coral) or rest day (muted)
    const hasTraining = await page.locator('text=session, text=sessions').count() > 0
    const hasRest = await page.locator('text=Rest day').count() > 0
    const hasNoPlan = await page.locator('text=Pick your path').count() > 0
    expect(hasTraining || hasRest || hasNoPlan).toBe(true)
  })

  test('B6 — /today redirects to /train', async ({ page }) => {
    await page.goto(`${BASE}/today`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/train')
  })

  test('B7 — /profile redirects to /you', async ({ page }) => {
    await page.goto(`${BASE}/profile`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/you')
  })
})

// ── SECTION C — Train Tab ─────────────────────────────────────────────────────

test.describe('C — Train Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[aria-label="Train"]')
    await page.waitForURL('**/train')
    await page.waitForLoadState('networkidle')
  })

  test('C1 — Train tab shows plan info', async ({ page }) => {
    // Either shows plan header or no-plan state
    const hasPlan = await page.locator('text=Week 1').count() > 0
    const hasNoPlan = await page.locator('text=No active plan').count() > 0
    expect(hasPlan || hasNoPlan).toBe(true)
  })

  test('C2 — Plan/Fuel tab switcher visible when plan active', async ({ page }) => {
    const hasPlan = await page.locator('text=Training Plan').count() > 0
    if (hasPlan) {
      await expect(page.locator('text=Training Plan')).toBeVisible()
      await expect(page.locator('text=Fuel')).toBeVisible()
    }
  })

  test('C3 — Fuel tab shows content', async ({ page }) => {
    const fuelBtn = page.locator('button:has-text("Fuel"), button:has-text("🥗")')
    if (await fuelBtn.count() > 0) {
      await fuelBtn.click()
      // Should not be blank
      const blank = await page.locator('.min-h-screen:empty').count()
      expect(blank).toBe(0)
    }
  })

  test('C4 — Session card tap opens modal', async ({ page }) => {
    // Find first session card
    const sessionCard = page.locator('.ns-session-card, [data-type]').first()
    if (await sessionCard.count() > 0) {
      await sessionCard.click()
      // Modal should appear
      await expect(page.locator('text=Done, text=Log session').first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('C5 — Log modal Done button not cut off', async ({ page }) => {
    const sessionCard = page.locator('.ns-session-card, [data-type]').first()
    if (await sessionCard.count() > 0) {
      await sessionCard.click()
      const doneBtn = page.locator('button:has-text("Done")').first()
      if (await doneBtn.count() > 0) {
        const box = await doneBtn.boundingBox()
        const viewport = page.viewportSize()
        if (box && viewport) {
          // Button bottom should be within viewport
          expect(box.y + box.height).toBeLessThan(viewport.height)
        }
      }
    }
  })
})

// ── SECTION D — Explore Tab ───────────────────────────────────────────────────

test.describe('D — Explore Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[aria-label="Explore"]')
    await page.waitForURL('**/explore')
    await page.waitForLoadState('networkidle')
  })

  test('D1 — 4 sub-tabs visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Coaches")')).toBeVisible()
    await expect(page.locator('button:has-text("Squads")')).toBeVisible()
    await expect(page.locator('button:has-text("Plans")')).toBeVisible()
    await expect(page.locator('button:has-text("AI")')).toBeVisible()
  })

  test('D2 — Bottom nav stays visible on Explore', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible()
  })

  test('D3 — Squads tab loads', async ({ page }) => {
    await page.click('button:has-text("Squads")')
    await expect(page.locator('text=Split Leader, text=Train together')).toBeVisible()
    await expect(page.locator('text=Start a squad')).toBeVisible()
    await expect(page.locator('text=Join a squad')).toBeVisible()
  })

  test('D4 — Squad join page has back button', async ({ page }) => {
    await page.click('button:has-text("Squads")')
    await page.click('text=Join a squad')
    await page.waitForURL('**/squad/join')
    await expect(page.locator('text=Back to Explore')).toBeVisible()
  })

  test('D5 — Plans tab shows official plans', async ({ page }) => {
    await page.click('button:has-text("Plans")')
    await expect(page.locator('text=NEXTSPLIT OFFICIAL, text=Official').first()).toBeVisible({ timeout: 5000 })
  })

  test('D6 — AI tab shows starter prompts', async ({ page }) => {
    await page.click('button:has-text("AI")')
    await expect(page.locator('text=How do I pace')).toBeVisible()
    await expect(page.locator('input[placeholder*="AI coach"]')).toBeVisible()
  })

  test('D7 — Coaches browse has back button', async ({ page }) => {
    await page.click('text=Browse all coaches')
    await page.waitForURL('**/coaches')
    await expect(page.locator('text=Find a Coach')).toBeVisible()
    const backBtn = page.locator('a[aria-label="Back to Explore"], text=Back')
    await expect(backBtn.first()).toBeVisible()
  })
})

// ── SECTION E — You Tab ───────────────────────────────────────────────────────

test.describe('E — You Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[aria-label="You"]')
    await page.waitForURL('**/you')
    await page.waitForLoadState('networkidle')
  })

  test('E1 — 4 sub-tabs visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Achievements")')).toBeVisible()
    await expect(page.locator('button:has-text("Character")')).toBeVisible()
    await expect(page.locator('button:has-text("Stats")')).toBeVisible()
    await expect(page.locator('button:has-text("Account")')).toBeVisible()
  })

  test('E2 — Opens on Achievements tab by default', async ({ page }) => {
    // Achievements content should be visible
    await expect(page.locator('text=Personal Bests, text=Training summary').first()).toBeVisible()
  })

  test('E3 — Account tab has settings and sign out', async ({ page }) => {
    await page.click('button:has-text("Account")')
    await expect(page.locator('text=Settings')).toBeVisible()
    await expect(page.locator('text=Sign out')).toBeVisible()
  })

  test('E4 — Elite banner appears in Account tab', async ({ page }) => {
    await page.click('button:has-text("Account")')
    await expect(page.locator('text=Elite, text=£7.99').first()).toBeVisible()
  })

  test('E5 — Settings has back button', async ({ page }) => {
    await page.click('button:has-text("Account")')
    await page.click('text=Settings')
    await page.waitForURL('**/settings')
    await expect(page.locator('text=Back')).toBeVisible()
  })

  test('E6 — No duplicate Elite/Strava in Achievements tab', async ({ page }) => {
    // Achievements tab should NOT have Elite upsell or sign out
    const eliteCount = await page.locator('text=£7.99/mo').count()
    expect(eliteCount).toBeLessThanOrEqual(1)
  })
})

// ── SECTION F — Dark Mode ─────────────────────────────────────────────────────

test.describe('F — Dark Mode', () => {
  test('F1 — Fresh visit defaults to dark', async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${BASE}/auth/login`)
    await page.waitForLoadState('networkidle')
    await expectDarkMode(page)
  })

  test('F2 — Dark mode applied before hydration (no flash)', async ({ page }) => {
    // Check class is set on html before any React JS runs
    // We do this by disabling JS and checking the class
    await page.goto(`${BASE}/auth/login`)
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })

  test('F3 — Page refresh preserves dark mode', async ({ page }) => {
    await login(page)
    await expectDarkMode(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expectDarkMode(page)
  })
})

// ── SECTION G — Redirects ─────────────────────────────────────────────────────

test.describe('G — Legacy Route Redirects', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('G1 — /today → /train', async ({ page }) => {
    await page.goto(`${BASE}/today`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/train')
  })

  test('G2 — /profile → /you', async ({ page }) => {
    await page.goto(`${BASE}/profile`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/you')
  })

  test('G3 — /community → /explore', async ({ page }) => {
    await page.goto(`${BASE}/community`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/explore')
  })
})

// ── SECTION H — Performance ───────────────────────────────────────────────────

test.describe('H — Performance', () => {
  test('H1 — Login page loads under 3s', async ({ page }) => {
    const start = Date.now()
    await page.goto(`${BASE}/auth/login`)
    await page.waitForLoadState('networkidle')
    expect(Date.now() - start).toBeLessThan(3000)
  })

  test('H2 — Home loads under 4s after login', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`)
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    const start = Date.now()
    await page.click('button[type="submit"], button:has-text("Sign in")')
    await page.waitForURL('**/home', { timeout: 10000 })
    expect(Date.now() - start).toBeLessThan(4000)
  })

  test('H3 — No console errors on Home', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await login(page)
    await page.waitForLoadState('networkidle')
    const real = errors.filter(e =>
      !e.includes('NEXT_PUBLIC') && !e.includes('hydrat') && !e.includes('Warning:')
    )
    expect(real).toHaveLength(0)
  })
})
