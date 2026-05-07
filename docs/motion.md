# Motion system

Single-page reference for animation, frame-budget, and reduced-motion compliance across NextSplit. P2.6 deliverable (council 2026-05-07).

## Tokens & primitives

All keyframes are defined in `src/app/globals.css` under "Session Celebration Animations":

| Keyframe        | Used by                                          | Duration       |
|-----------------|--------------------------------------------------|----------------|
| `fadeIn`        | SessionCelebration backdrop                      | 0.4s ease-out  |
| `slideUp`       | Celebration content card, modal entrances        | 0.5s spring    |
| `xpFloat`       | XP number floater (post-log)                     | 1.2s ease-out  |
| `levelBurst`    | Level-up burst                                   | 0.6s spring    |
| `splityBounce`  | Splity entrance on celebration                   | 0.6s spring    |
| `spin360`       | Star icon on level up                            | 0.8s ease-out  |
| `pulse-glow`    | Generic emphasis pulse                           | 2s loop        |

JS-driven animations (bypass CSS — must be guarded individually):

| Site                                      | Driver           | Frequency  | Reduced-motion guard |
|-------------------------------------------|------------------|------------|----------------------|
| `Splity.tsx` idle bob                     | setInterval+state| 16ms (62.5Hz)| matchMedia at top of effect |
| `SessionCelebration.tsx` confetti         | requestAnimationFrame | 60fps | matchMedia early-return |
| `PlanGenerationScreen.tsx` msg+progress   | 2× setInterval   | 1200ms / 160ms | matchMedia early-return → snap progress to 85 |
| `AIOnboardingClient.tsx` analyse messages | setInterval      | 1100ms     | matchMedia early-return |
| `FocusMode.tsx` elapsed timer             | setInterval      | 1000ms     | NOT guarded (functional, not decorative) |

## Reduced-motion compliance

WCAG 2.2 SC 2.3.3 (Animation from Interactions). NextSplit suppresses all decorative motion when `prefers-reduced-motion: reduce` is set.

Two layers:

1. **CSS layer** — `src/app/globals.css` carries a single `@media (prefers-reduced-motion: reduce)` block that sets `animation-duration: 0.01ms` and `animation-iteration-count: 1` for every element. Neutralises every keyframe at once. Site-wide.

2. **JS layer** — every `setInterval` / `setTimeout` / `requestAnimationFrame` driven from React must check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` at the top of its effect and return early. CSS guards do not reach JS-driven state mutation.

When adding a new animation:
- Pure CSS via keyframes → no extra work; the global `@media` block handles it.
- JS-driven (rAF, setInterval, motion-controlled state) → add the matchMedia early-return.
- Functional timing (e.g. workout elapsed counter) → DO NOT guard. Users still need the timer.

## Frame budget

Target: 60fps on Snapdragon 4xx (~4ms JS budget per frame).

Rules of thumb:
- **Splity**: at sizes ≤ 32px pass `animate={false}`. The 62.5Hz setInterval bob is wasteful at icon scale (P1.5 finding). Default convention documented in `Splity.tsx` header.
- **Celebration screen**: only one rAF loop allowed at peak. The confetti loop self-terminates after ~80 frames; Splity bob is reduced-motion-guarded; no other concurrent JS animations should fire at the same render frame.
- **Long-running CSS animations**: avoid `animation-iteration-count: infinite` on more than 1-2 elements simultaneously. The `pulse-glow` loop is acceptable as one-off accent; do not stack.

## Audit findings (P2.6, 2026-05-07)

Pre-P2.6 unguarded JS animations:
- `PlanGenerationScreen.tsx:171-172` — message rotation + progress fill during AI plan generation.
- `AIOnboardingClient.tsx:119` — analysis-message rotation during onboarding.

Both decorative (loading flair while an async API call resolves). Both now guarded by matchMedia early-return (this commit). The plan-generation progress bar snaps to 85% under reduced-motion so the screen still tells the user "we're working" without animating.

`FocusMode.tsx:37` is intentionally unguarded — the elapsed timer is functional content, not motion.

`PlanPathSVG.tsx` uses pure CSS keyframes, fully covered by the global `@media` block.
