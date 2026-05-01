'use client'

import { OnboardingProvider, useOnboarding } from './context/OnboardingContext'
import { WelcomeScreen }           from './components/WelcomeScreen'
import { CharacterCreationScreen }  from './components/CharacterCreationScreen'
import { StravaConnectScreen }      from './components/StravaConnectScreen'
import { Suspense }                  from 'react'
import { SportSelectScreen }        from './components/SportSelectScreen'
import { AboutYouScreen }           from './components/AboutYouScreen'
import { YourRunningScreen }        from './components/YourRunningScreen'
import { GoalsScreen }              from './components/GoalsScreen'
import { YourLifeScreen }           from './components/YourLifeScreen'
import { GymConfigScreen }          from './components/GymConfigScreen'
import { TrainingPathScreen }       from './components/TrainingPathScreen'
import { PlanGenerationScreen }     from './components/PlanGenerationScreen'
import { PlanPreviewScreen }        from './components/PlanPreviewScreen'

// Step map:
//  1  Welcome
//  2  Character creation + @handle
//  3  Strava connect (optional — skip skips, connect pre-fills)
//  4  Sport select
//  5  About You
//  6  Your Running  (pre-filled if Strava connected)
//  7  Goals
//  8  Your Life     (pre-filled if Strava connected)
//  9  Gym config
// 10  Training path
// 11  Plan generation
// 12  Plan preview

function OnboardingFlow() {
  const { step } = useOnboarding()

  switch (step) {
    case 1:  return <WelcomeScreen />
    case 2:  return <CharacterCreationScreen />
    case 3:  return <Suspense fallback={null}><StravaConnectScreen /></Suspense>
    case 4:  return <SportSelectScreen />
    case 5:  return <AboutYouScreen />
    case 6:  return <YourRunningScreen />
    case 7:  return <GoalsScreen />
    case 8:  return <YourLifeScreen />
    case 9:  return <GymConfigScreen />
    case 10: return <TrainingPathScreen />
    case 11: return <PlanGenerationScreen />
    case 12: return <PlanPreviewScreen />
    default: return <WelcomeScreen />
  }
}

export default function OnboardingEntry({
  initialStep = 1,
  existingProfile = null,
}: {
  initialStep?: number
  existingProfile?: Record<string, string | null> | null
}) {
  return (
    <OnboardingProvider initialStep={initialStep} existingProfile={existingProfile}>
      <OnboardingFlow />
    </OnboardingProvider>
  )
}
