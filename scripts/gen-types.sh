#!/bin/bash
# Generate typed Supabase client — eliminates `as any`/`as never` casts on DB queries.
# Run this whenever the database schema changes.
# Requires: npx supabase login (one-time setup) OR a SUPABASE_ACCESS_TOKEN env var.
#
# Audit ref: docs/audit/audit-report-v1.md §S5 — output path was previously
# src/types/supabase-generated.ts, but the codebase imports from
# src/types/database.ts. Running the script wrote to the unused file and
# left the imported file stale, giving false sense of completion.

set -euo pipefail

PROJECT_ID="$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3 | cut -d'.' -f1)"

echo "Generating Supabase types (project: ${PROJECT_ID}) → src/types/database.ts"
npx supabase gen types typescript --project-id "${PROJECT_ID}" > src/types/database.ts

echo "Done. Imports from '@/types/database' now reflect the live schema."
