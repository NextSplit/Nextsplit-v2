# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 13 (UI-5 complete)_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. Read EXACT NEXT STEPS below before writing any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
a41b248  Phase UI-5: PB toast confetti, XP float, check-pop, LevelUp star burst, undo slide-up
5d7a7ce  Phase UI-4: TDEE calculator, AI fuel coach, calorie ring, macro bars
d135c16  Phase UI-3: kit colour, character states, medal overlays
69e3787  docs: update HANDOFF-2 after Phase UI-2 complete
133177f  Phase UI-2: session card redesign, week progress bar, colour tightening
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava
- Phase UI-1 ✅ Tab renames + reorders
- Phase UI-2 ✅ Session card redesign, progress bar, colour tightening
- Phase UI-3 ✅ Character: kit colour, states, medals
- Phase UI-4 ✅ Fuel: TDEE, AI coach, calorie ring
- Phase UI-5 ✅ Motion & delight: confetti, XP float, check-pop, star burst, slide-ups

---

## EXACT NEXT STEPS

### Phase 10 — Social + sharing (NEXT)

#### TASK 1 — Upgrade ShareSessionCard to proper image
File: `src/components/ShareSessionCard.tsx`
Currently renders a basic card. Upgrade to:
- Use html2canvas or a CSS-only card that looks great as a screenshot
- Show: session name, distance/time/pace, effort, XP earned, NextSplit branding
- Teal gradient background, white text, character emoji

#### TASK 2 — Weekly summary share card
New component: `src/components/WeeklyShareCard.tsx`
Triggered from the "All done" celebration or Monday weekly report card.
Shows: week number, sessions done/planned, km logged, streak, XP earned

#### TASK 3 — Public profile page
New route: `src/app/u/[username]/page.tsx`
- Read-only public view of a user's Character tab
- Shows: character avatar, level, badges unlocked, recent PBs, streak
- URL: nextsplit.app/u/[username]
- Username stored in profiles table (needs migration + settings UI)

### Phase 11 — Stripe + Pro tier (after Phase 10)
- ProGate already wired (src/components/ProGate.tsx)
- NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open currently)
- Add: Stripe checkout route, webhook handler, update profiles.is_pro in Supabase
- Gate behind Pro: AI coaching unlimited, advanced analytics, character cosmetics
- Pricing: ~£7.99/mo or £59/yr

### Phase 12 — Coach tier
- Admin dashboard to view multiple athletes
- Athlete invite links
- Coach-written plan templates

---

## Key files
- Today tab:      src/app/today/TodayClient.tsx
- Coach tab:      src/app/dashboard/StatsClient.tsx
- Character tab:  src/app/profile/ProfileClient.tsx
- Fuel tab:       src/app/nutrition/NutritionClient.tsx
- RPG lib:        src/lib/rpg.ts (renderCharSVG takes optional kitColourOverride)
- Nutrition lib:  src/lib/nutrition.ts (calcCalories: weight, dayType, height?, age?, sex?)
- Session utils:  src/lib/sessionUtils.ts (accent colours)
- Global CSS:     src/app/globals.css (UI-5 keyframes: slide-up, xp-float, check-pop, confetti, star-orbit, level-in, card-up)
- Share card:     src/components/ShareSessionCard.tsx (upgrade target)
- ProGate:        src/components/ProGate.tsx

## Architecture
- Next.js 16, Supabase, all tabs client components
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- AI: Anthropic API called client-side (fuel coach, stats coaching card)
- Kit colour: localStorage nextsplit_kit_colour
- TDEE: localStorage nextsplit_tdee_height/age/sex
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all features open)
- Animations: pure CSS keyframes in globals.css, no animation libraries

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
