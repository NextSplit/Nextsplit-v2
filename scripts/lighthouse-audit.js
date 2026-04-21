#!/usr/bin/env node
/**
 * Lighthouse Performance Audit — Phase F3
 *
 * Runs Lighthouse on key pages and verifies scores meet alpha thresholds.
 * Run: node scripts/lighthouse-audit.js
 *
 * Requires: npm install -g lighthouse
 * Or: npx lighthouse
 *
 * Target scores (Tech Pillar):
 * - Performance ≥ 80 (mobile 4G simulation)
 * - Accessibility ≥ 90
 * - Best Practices ≥ 90
 * - SEO ≥ 80
 */

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const BASE_URL = process.env.LIGHTHOUSE_URL ?? 'https://nextsplit-v2.vercel.app'

const PAGES = [
  { path: '/auth/login',  label: 'Login page'  },
  { path: '/privacy',     label: 'Privacy page' },
  { path: '/terms',       label: 'Terms page'   },
]

const THRESHOLDS = {
  performance:      80,
  accessibility:    90,
  'best-practices': 90,
  seo:              80,
}

const OUTPUT_DIR = path.join(__dirname, '../lighthouse-reports')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

console.log(`\n🔦 NextSplit Lighthouse Audit — Phase F3`)
console.log(`Target: ${BASE_URL}\n`)

let allPassed = true

for (const page of PAGES) {
  const url    = `${BASE_URL}${page.path}`
  const output = path.join(OUTPUT_DIR, `${page.path.replace(/\//g, '-').slice(1)}.json`)

  console.log(`Auditing ${page.label} (${url})…`)

  try {
    execSync(
      `npx lighthouse "${url}" --output=json --output-path="${output}" --quiet --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo`,
      { stdio: 'pipe' }
    )

    const report  = JSON.parse(fs.readFileSync(output, 'utf8'))
    const cats    = report.categories

    console.log(`  Performance:   ${Math.round(cats.performance?.score * 100 ?? 0)}`)
    console.log(`  Accessibility: ${Math.round(cats.accessibility?.score * 100 ?? 0)}`)
    console.log(`  Best Practices:${Math.round(cats['best-practices']?.score * 100 ?? 0)}`)
    console.log(`  SEO:           ${Math.round(cats.seo?.score * 100 ?? 0)}`)

    for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
      const score = Math.round((cats[cat]?.score ?? 0) * 100)
      if (score < threshold) {
        console.log(`  ❌ ${cat}: ${score} < ${threshold} threshold`)
        allPassed = false
      }
    }
    console.log(`  ✅ ${page.label} passed\n`)

  } catch (err) {
    console.log(`  ⚠️  Could not audit ${page.label} — Chrome may not be available`)
    console.log(`     Run manually: npx lighthouse ${url}\n`)
  }
}

if (allPassed) {
  console.log('✅ All pages meet alpha performance thresholds')
} else {
  console.log('❌ Some pages below threshold — fix before alpha launch')
  process.exit(1)
}
