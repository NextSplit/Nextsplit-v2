'use client'

import { OnboardingProvider, useOnboarding } from './context/OnboardingContext'
import { WelcomeScreen } from './components/WelcomeScreen'
import { CharacterCreationScreen } from './components/CharacterCreationScreen'

// Placeholder screens for steps we build next session
function ComingSoonScreen({ title }: { title: string }) {
  const { next, back, step } = useOnboarding()
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-4xl">🚧</div>
      <h2 className="text-lg font-bold text-slate-700">{title}</h2>
      <p className="text-sm text-slate-400">Step {step} — building next session</p>
      <div className="flex gap-3 mt-4">
        <button onClick={back} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">← Back</button>
        <button onClick={next} className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold">Next →</button>
      </div>
    </div>
  )
}

function OnboardingFlow() {
  const { step } = useOnboarding()

  switch (step) {
    case 1:  return <WelcomeScreen />
    case 2:  return <CharacterCreationScreen />
    case 3:  return <ComingSoonScreen title="Select your sport" />
    case 4:  return <ComingSoonScreen title="About You" />
    case 5:  return <ComingSoonScreen title="Your Running" />
    case 6:  return <ComingSoonScreen title="Your Goals" />
    case 7:  return <ComingSoonScreen title="Your Life" />
    case 8:  return <ComingSoonScreen title="Gym Configuration" />
    case 9:  return <ComingSoonScreen title="Choose your training path" />
    case 10: return <ComingSoonScreen title="Building your plan…" />
    case 11: return <ComingSoonScreen title="Your plan preview" />
    default: return <WelcomeScreen />
  }
}

export default function OnboardingEntry() {
  return (
    <OnboardingProvider initialStep={1}>
      <OnboardingFlow />
    </OnboardingProvider>
  )
}
