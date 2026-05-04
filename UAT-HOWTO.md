# NextSplit UAT — How to Run

## Quick start (3 commands)

```bash
# 1. Install playwright browsers (one-time)
npx playwright install chromium

# 2. Create test user + verify DB
SUPABASE_SERVICE_ROLE_KEY=<your-key> npx tsx scripts/uat-db-verify.ts

# 3. Run full E2E suite against production
BASE_URL=https://nextsplit.app UAT_EMAIL=uat@nextsplit.app UAT_PASSWORD=UATtest2026! npx playwright test src/test/e2e/uat-full.spec.ts

# View HTML report
npx playwright show-report
```

## What each script does

### `scripts/uat-db-verify.ts` (Option 2 — DB checks)
- Verifies all required tables exist
- Checks RLS is blocking anonymous access
- Validates data integrity (no duplicate handles, valid km values etc)
- Creates `uat@nextsplit.app` test account
- Seeds a Marathon Novice plan for the test account
- Run: `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts`

### `src/test/e2e/uat-full.spec.ts` (Option 1 — E2E tests)
- 40+ tests covering Auth, Home, Train, Explore, You, Dark Mode, Redirects, Performance
- Runs against nextsplit.app using the UAT test account
- Generates HTML report with screenshots on failure
- Run: `BASE_URL=https://nextsplit.app UAT_EMAIL=uat@nextsplit.app UAT_PASSWORD=UATtest2026! npx playwright test src/test/e2e/uat-full.spec.ts`

### `UAT-SCRIPT-V1.md` (Option 3 — Manual)
- 105 manual test cases across 10 sections
- Use for flows that need real-device testing (safe area insets, touch, etc)

## Test account
- Email: uat@nextsplit.app
- Password: UATtest2026!
- Created by: `uat-db-verify.ts`

## Interpreting results

| Result | Meaning |
|--------|---------|
| All green | Ready for alpha invites |
| 1-2 minor failures | Fix before invites, not a blocker |
| Any auth/RLS failure | STOP — security issue, fix immediately |
| Any data integrity failure | Check DB before invites |

## Re-running after fixes
```bash
# Run only failed tests
npx playwright test --last-failed

# Run a specific section
npx playwright test --grep "Section D"

# Run with headed browser to watch
npx playwright test --headed
```
