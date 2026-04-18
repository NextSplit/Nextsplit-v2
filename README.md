# NextSplit v2

Intelligent running training — Next.js + Supabase + Vercel.

## Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **Hosting:** Vercel

## Getting started

### 1. Database setup
Run `supabase_schema.sql` in Supabase Dashboard → SQL Editor.

### 2. Environment
```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Development
```bash
npm install
npm run dev
```

### 4. Deploy
Connect repo to Vercel. Add environment variables in Vercel dashboard.
Set `NEXT_PUBLIC_SITE_URL` to your Vercel deployment URL for OAuth callbacks.

## Project structure
```
src/
  app/           # Next.js App Router pages
  components/    # React components
  lib/supabase/  # Supabase client utilities
  types/         # TypeScript types
  hooks/         # Custom React hooks
```

## Database schema
See `supabase_schema.sql` — 9 tables, full RLS policies.

## Plan library
JSON plan files in `plans/` directory. 20 plans from Couch to 5k → 100-mile ultra.
