"""
Add gym sessions to all 17 NextSplit plan templates.

Rules:
- Race week (b=r): no gym
- Taper/deload (b=d): gym-c only (posterior chain / mobility) on day 2 if rest
- Build weeks (b=k): alternate gym-a/gym-b on rest days (not day before/after long run day 6)
- Peak weeks (b=p): gym-b only (upper body — preserve legs)
- Beginners (3 rest days 0,2,4): 1 gym session on day 2 only
- Intermediate (2 rest days 2,4): 2 gym sessions days 2+4, alternating A then B
- Advanced (1 rest day 4): 1 gym session day 4
- Ultra: same as advanced

Set/rep scheme varies by phase:
- Base/build (b=k): 3x10 — hypertrophy, building capacity
- Peak (b=p): 4x5 — strength emphasis
- Deload (b=d): 2x12 — light maintenance

Gym session definitions per type + phase:
  gym-a (Lower body - runners):
    Squat, RDL, Split squat, Calf raise, Core
  gym-b (Upper body + posterior):
    Pull-ups, DB row, Press, Face pulls, Core
  gym-c (Posterior chain / mobility):
    Hip thrust, Nordic curl, Lateral band walk, Calf raise, Stretching circuit

The 'det' field uses format: "Exercise NxM · Exercise NxM · ..."
This is parsed by parseDetToExercises() in gymUtils.ts
km is always 0 for gym sessions.
"""

import json
import glob
import os

# ─── Gym session templates by type and intensity ───────────────────────────────

def gym_session(gym_type: str, b_flag: str, week_num: int, is_alternating_b: bool = False) -> dict:
    """Build a gym session object for the given type and build flag."""
    
    # Set/rep scheme based on phase
    if b_flag == 'd':      # deload/taper
        scheme = '2x12'
        intensity = 'light'
    elif b_flag == 'p':    # peak
        scheme = '4x5'
        intensity = 'heavy'
    else:                   # build (k) or first week (d=base)
        scheme = '3x10'
        intensity = 'moderate'

    if gym_type == 'gym-a':
        # Lower body — primary runner strength
        det = f'Back squat {scheme} · Romanian deadlift {scheme} · Bulgarian split squat {scheme} · Calf raise 3x15 · Core circuit 2x45s'
        if b_flag == 'd':
            det = f'Goblet squat {scheme} · Romanian deadlift {scheme} · Reverse lunge {scheme} · Calf raise 2x15 · Core circuit 2x30s'
        name = 'Strength A — Lower body'
        coach_note = {
            'k': 'Lower body strength is the engine of your running economy. These compound lifts build the hip and quad strength that keeps your form together in the final miles.',
            'p': 'Heavy lower body work this week — keep the loads honest, depth full, and rest complete between sets. Your legs are already under load from training so quality beats grinding through fatigue.',
            'd': 'A lighter lower body session to keep the stimulus without adding fatigue. Focus on range of motion and control, not load.',
        }

    elif gym_type == 'gym-b':
        # Upper body + posterior — posture and arm drive
        det = f'Pull-ups {scheme} · DB row {scheme} · Overhead press {scheme} · Face pulls 3x15 · Core circuit 2x45s'
        if b_flag == 'd':
            det = f'Banded pull-apart 3x20 · DB row {scheme} · Push-ups 2x15 · Face pulls 2x15 · Core circuit 2x30s'
        name = 'Strength B — Upper body'
        coach_note = {
            'k': 'Strong upper body and core keeps your posture tall when you tire. These sessions directly improve arm drive efficiency and reduce the slumping that costs you energy late in a race.',
            'p': 'Upper body work while your legs taper — good timing. Pull movements build the postural strength that holds your form together at race pace.',
            'd': 'Light upper body maintenance. Keep the movements controlled, focus on the feeling of each rep, and treat this as active recovery.',
        }

    else:  # gym-c — posterior chain / mobility
        det = 'Hip thrust 3x12 · Nordic curl 3x5 · Lateral band walk 3x20 · Calf raise 2x20 · Stretching circuit 10min'
        name = 'Posterior chain & mobility'
        coach_note = {
            'k': 'Your hamstrings and glutes do the real work in running — they extend your hip with every stride. This session targets the posterior chain directly and adds the mobility work your body needs to absorb training load.',
            'p': 'Posterior chain and mobility work during your peak phase — this is targeted recovery as much as training. The hip thrusts keep glute activation sharp without taxing the quads you need for long efforts.',
            'd': 'A gentle posterior chain session and mobility work. During taper this is about keeping the body feeling loose and activated, not adding load.',
        }

    note_key = b_flag if b_flag in ('k', 'p', 'd') else 'k'
    coached_det = f'{det} — {coach_note[note_key]}'

    return {
        'c': gym_type,
        'n': name,
        'det': coached_det,
        'km': 0,
    }


def should_add_gym(week: dict) -> bool:
    """Return False for race weeks — no gym at all."""
    return week.get('b', 'k') != 'r'


def get_gym_type_for_week(week_num: int, b_flag: str, is_second_slot: bool, level: str) -> str:
    """Determine which gym type to place."""
    if b_flag == 'd':
        return 'gym-c'  # Always mobility/posterior in deload/taper
    if b_flag == 'p':
        return 'gym-b' if is_second_slot else 'gym-b'  # Peak: upper body only to spare legs
    # Build weeks: alternate A and B by week number
    if is_second_slot:
        return 'gym-b' if week_num % 2 == 0 else 'gym-a'
    return 'gym-a' if week_num % 2 == 0 else 'gym-b'


def add_gym_to_plan(plan_path: str) -> None:
    with open(plan_path) as f:
        plan = json.load(f)

    weeks = plan.get('weeks', plan.get('weeks_data', []))
    meta = plan.get('meta', {})
    level = meta.get('level', 'intermediate')

    # Determine rest day pattern from week 1
    w1 = weeks[0]
    rest_days = [i for i, d in enumerate(w1['days']) if not d.get('sessions')]
    
    # Decide gym day slots based on level and rest day availability
    if level == 'beginner':
        # 1 gym session on day 2 only (mid-week rest)
        gym_slots = [2] if 2 in rest_days else ([rest_days[0]] if rest_days else [])
    elif level == 'advanced':
        # 1 gym session on day 4 (Friday rest)
        gym_slots = [4] if 4 in rest_days else ([rest_days[-1]] if rest_days else [])
    else:
        # Intermediate: 2 sessions on days 2 and 4
        gym_slots = []
        if 2 in rest_days:
            gym_slots.append(2)
        if 4 in rest_days:
            gym_slots.append(4)
        if not gym_slots and rest_days:
            gym_slots = rest_days[:2]

    if not gym_slots:
        print(f'  WARNING: No rest days found for {plan_path}')
        return

    modified_weeks = 0
    for w in weeks:
        b_flag = w.get('b', 'k')
        week_num = w.get('n', 1)

        if not should_add_gym(w):
            continue  # Skip race weeks

        for slot_idx, day_idx in enumerate(gym_slots):
            days = w.get('days', [])
            if day_idx >= len(days):
                continue
            day = days[day_idx]

            # Only add to empty days (rest days)
            if day.get('sessions'):
                continue

            is_second_slot = slot_idx > 0
            gym_type = get_gym_type_for_week(week_num, b_flag, is_second_slot, level)
            session = gym_session(gym_type, b_flag, week_num, is_second_slot)
            day['sessions'] = [session]

        modified_weeks += 1

    print(f'  Modified {modified_weeks} weeks, gym slots: day {gym_slots}')

    # Save back
    with open(plan_path, 'w') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)


# ─── Run on all plans ──────────────────────────────────────────────────────────

plan_files = sorted(glob.glob('/home/claude/nextsplit-v2/plans/*.json'))
print(f'Processing {len(plan_files)} plans...\n')

for plan_path in plan_files:
    name = plan_path.split('/')[-1]
    print(f'{name}:')
    add_gym_to_plan(plan_path)
    print()

print('Done.')
