#!/bin/bash
# Generate typed Supabase client - eliminates all "as any" casts on DB queries
# Run this whenever the database schema changes
# Requires: npx supabase login (one-time setup)

echo "Generating Supabase types..."
npx supabase gen types typescript \
  --project-id $(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3 | cut -d'.' -f1) \
  > src/types/supabase-generated.ts

echo "Done. Import from '@/types/supabase-generated' instead of using 'as any'"
echo "Next step: Replace (supabase as any) with typed client throughout codebase"
