export const NUDGE_MESSAGES: Record<string, string> = {
  missing:    "Your squad misses you — time to lace up! 👟",
  week:       "One run can change your whole week. Let's go 🔥",
  ran:        "Your squad ran without you today. Tomorrow's yours 💪",
  checkin:    "Quick check-in — you good? Squad's thinking of you 🙌",
  streak:     "Don't break the streak now, you're so close ⚡",
  champion:   "Rain or shine, champions run. See you out there 🏃",
  day:        "Your leader thinks today's your day. Prove them right.",
  motivation: "Every run counts. Your squad is rooting for you 🎯",
}

export const NUDGE_KEYS = Object.keys(NUDGE_MESSAGES) as (keyof typeof NUDGE_MESSAGES)[]
