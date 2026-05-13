#!/bin/bash
# Generate typed Supabase client — fresh snapshot of the live schema.
#
# DUAL FILE CONVENTION (PR J7):
# - src/types/database.ts            = HAND-ROLLED. Source of truth for
#                                      call sites. Carries literal-union
#                                      enums (e.g. `experience: 'beginner'
#                                      | 'intermediate' | 'advanced'`)
#                                      and curated table aliases.
# - src/types/database.generated.ts  = FULL LIVE SNAPSHOT. Auto-generated
#                                      from the Supabase Management API.
#                                      Use to spot drift; don't import.
#
# Refresh workflow (whenever a migration changes the schema):
#   1. Apply the migration.
#   2. Run `npm run types:gen` (this script) OR call the Supabase MCP's
#      `generate_typescript_types` from a Claude session.
#   3. Diff `git status src/types/database.generated.ts` to spot drift.
#   4. Hand-update `src/types/database.ts` for any new column or table
#      that call sites need typed access to.
#
# Requires: npx supabase login (one-time setup) OR SUPABASE_ACCESS_TOKEN env.

set -euo pipefail

PROJECT_ID="$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3 | cut -d'.' -f1)"

echo "Generating Supabase types (project: ${PROJECT_ID}) → src/types/database.generated.ts"
npx supabase gen types typescript --project-id "${PROJECT_ID}" > src/types/database.generated.ts

echo "Done. Diff with: git diff src/types/database.generated.ts"
echo "If new tables/columns appeared, mirror the ones call sites need into src/types/database.ts."
