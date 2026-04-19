"""
Fix week 1 gym sessions: when b=d and week_num == 1, 
it's a base/intro week not a deload. Replace gym-c with gym-a (lower body)
and fix the coaching note accordingly.
"""
import json, glob

BASE_W1_GYM_A = {
    'c': 'gym-a',
    'n': 'Strength A — Lower body',
    'det': 'Goblet squat 3x10 · Romanian deadlift 3x10 · Reverse lunge 3x10 · Calf raise 3x15 · Core circuit 2x30s — Your first strength session. Keep loads light — this week is about learning the movements and establishing the habit. Lower body strength is foundational to running economy.',
    'km': 0
}

BASE_W1_GYM_B = {
    'c': 'gym-b',
    'n': 'Strength B — Upper body',
    'det': 'Pull-ups 3x5 · DB row 3x10 · Push-ups 3x10 · Face pulls 3x15 · Core circuit 2x30s — Your first upper body session. Focus on form, not load. Upper body and core strength directly improves your running posture and arm drive efficiency.',
    'km': 0
}

for f in sorted(glob.glob('plans/*.json')):
    with open(f) as fp:
        p = json.load(fp)
    weeks = p.get('weeks', [])
    modified = False
    
    for w in weeks:
        if w.get('n') != 1:
            continue
        for slot_idx, d in enumerate(w.get('days', [])):
            for s in d.get('sessions', []):
                if s.get('c') == 'gym-c' and 'taper' in s.get('det', '').lower():
                    # Replace with appropriate base week gym session
                    new_session = BASE_W1_GYM_B if slot_idx > 0 else BASE_W1_GYM_A
                    s['c'] = new_session['c']
                    s['n'] = new_session['n']
                    s['det'] = new_session['det']
                    modified = True
    
    if modified:
        with open(f, 'w') as fp:
            json.dump(p, fp, ensure_ascii=False, indent=2)
        print(f'Fixed: {f.split("/")[-1]}')
    else:
        print(f'OK:    {f.split("/")[-1]}')

print('\nDone.')
