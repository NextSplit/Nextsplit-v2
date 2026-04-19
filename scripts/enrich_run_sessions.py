"""
Enrich running session det fields with coached rationale.
Transforms bare technical detail into coached notes.
Pattern: "technical detail — coaching rationale"
"""
import json, glob, re

# Map session type + context to coaching rationales
def get_rationale(session_type: str, b_flag: str, week_num: int, total_weeks: int) -> str:
    weeks_to_end = total_weeks - week_num
    
    if session_type == 'run-easy':
        if b_flag == 'd':
            return "Easy effort means conversational pace. This is recovery — your body adapts to training during rest, not during hard sessions."
        return "Keep this genuinely easy. The bulk of your aerobic development happens at low intensity and these runs build the engine that powers your quality sessions."
    
    elif session_type == 'run-long':
        if b_flag == 'd':
            return "A shorter long run this week — still builds time on feet and aerobic base without adding to accumulated fatigue."
        if weeks_to_end <= 3:
            return "A confidence long run in taper — resist the urge to push. Arrive at the start line rested, not tired from a final fitness test."
        return "The long run is the cornerstone of endurance training. Run it easy enough to hold a conversation and you'll finish feeling like you could go further — that's the goal."
    
    elif session_type == 'run-int':
        if weeks_to_end <= 3:
            return "Sharp intervals close to race week keep your legs feeling quick without adding volume. The fitness is already built — this is a reminder, not a workout."
        if b_flag == 'p':
            return "Peak-phase intervals — this is where your fitness is tested. These are hard but controlled. If the pace slips, the session is done."
        return "Intervals build your VO2max ceiling and teach your body to run efficiently at race pace. Recovery between reps should be easy enough that you can complete every interval at the target pace."
    
    elif session_type == 'run-tempo':
        if weeks_to_end <= 3:
            return "A short threshold session to maintain the feel of race effort. Comfortably hard — not racing."
        if b_flag == 'p':
            return "Threshold work at peak phase. Your lactate threshold determines the pace you can sustain for an hour. These sessions push that ceiling up."
        return "Threshold pace is 'comfortably hard' — you could speak in short phrases but not hold a conversation. It builds your ability to sustain faster paces for longer."
    
    elif session_type == 'run-race':
        return "Race day. Trust your training. Start conservatively — most races are won or lost in the second half."
    
    return ""


def enrich_plan(plan_path: str) -> None:
    with open(plan_path) as f:
        plan = json.load(f)
    
    weeks = plan.get('weeks', plan.get('weeks_data', []))
    total_weeks = len(weeks)
    
    for w in weeks:
        b_flag = w.get('b', 'k')
        week_num = w.get('n', 1)
        week_note = w.get('note', '')
        
        for day in w.get('days', []):
            for session in day.get('sessions', []):
                stype = session.get('c', '')
                if not stype.startswith('run-'):
                    continue
                
                det = session.get('det', '')
                if not det:
                    continue
                
                # Skip if already has a coached rationale (contains em dash)
                if ' — ' in det:
                    continue
                
                rationale = get_rationale(stype, b_flag, week_num, total_weeks)
                if rationale:
                    session['det'] = f"{det} — {rationale}"
    
    with open(plan_path, 'w') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)


plan_files = sorted(glob.glob('/home/claude/nextsplit-v2/plans/*.json'))
for plan_path in plan_files:
    name = plan_path.split('/')[-1]
    print(f'Enriching {name}...')
    enrich_plan(plan_path)

print(f'\nDone — {len(plan_files)} plans enriched.')
