"""
Update gym sessions in plan templates with progressive overload.
Sets/reps vary by week position within each phase:

Phase progression (b=k build weeks):
  Early phase (weeks 1-4 of phase): 3x12 — higher reps, learning movement patterns
  Mid phase (weeks 5-8):            4x8  — moderate volume, building strength  
  Late phase (weeks 9+):            4x6  — heavier, strength focus

Peak weeks (b=p): Always 4x5 — strength emphasis, heavier loads
Deload/taper (b=d): Always 2x12 — light maintenance
Race week (b=r): No gym (already handled)

Within each phase the week_count resets — so marathon weeks 1-3 of phase 1
are "early", weeks 4-8 are "mid", etc.
"""
import json, glob, re

def get_scheme(b_flag: str, week_in_phase: int) -> tuple[str, str]:
    """Returns (sets_reps_pattern, intensity_label)"""
    if b_flag == 'd':
        return '2x12', 'light'
    if b_flag == 'p':
        return '4x5', 'heavy'
    # build weeks - progressive
    if week_in_phase <= 3:
        return '3x12', 'moderate'
    elif week_in_phase <= 7:
        return '4x8', 'building'
    else:
        return '4x6', 'strong'

def update_gym_det(det: str, scheme: str) -> str:
    """Replace NxM patterns in the exercise part (before the — separator)."""
    if ' — ' in det:
        exercises_part, coaching_part = det.split(' — ', 1)
    else:
        exercises_part = det
        coaching_part = None

    # Replace all NxM patterns in exercises with the new scheme
    updated = re.sub(r'\d+x\d+', scheme, exercises_part)
    # Keep calf raises and core at higher reps
    # Calf: always 3x15-20, Core: always 2x45s or 2x30s
    updated = re.sub(r'Calf raise \d+x\d+', 'Calf raise 3x15', updated)
    updated = re.sub(r'Core circuit \d+x\d+s', lambda m: m.group(0), updated)  # keep core unchanged

    if coaching_part:
        return updated + ' — ' + coaching_part
    return updated

def process_plan(plan_path: str) -> int:
    with open(plan_path) as f:
        p = json.load(f)
    weeks = p.get('weeks', [])

    # Track week position within each phase
    phase_week_counts: dict[str, int] = {}
    modified = 0

    for w in weeks:
        b_flag = w.get('b', 'k')
        ph = w.get('ph', 'p1')

        if b_flag == 'r':
            continue  # no gym in race weeks

        if b_flag == 'k':
            phase_week_counts[ph] = phase_week_counts.get(ph, 0) + 1
            week_in_phase = phase_week_counts[ph]
        else:
            week_in_phase = 1  # deload/peak don't count toward progression

        scheme, _ = get_scheme(b_flag, week_in_phase)

        for day in w.get('days', []):
            for session in day.get('sessions', []):
                if not session.get('c', '').startswith('gym'):
                    continue
                det = session.get('det', '')
                if not det:
                    continue
                updated = update_gym_det(det, scheme)
                if updated != det:
                    session['det'] = updated
                    modified += 1

    with open(plan_path, 'w') as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

    return modified

# Process all plans
total = 0
for plan_path in sorted(glob.glob('/home/claude/nextsplit-v2/plans/*.json')):
    name = plan_path.split('/')[-1]
    count = process_plan(plan_path)
    print(f'{name}: {count} sessions updated')
    total += count

print(f'\nTotal: {total} sessions updated with progressive loading')
