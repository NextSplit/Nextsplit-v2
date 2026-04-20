'use client'

import { OnboardingProvider, useOnboarding } from './context/OnboardingContext'
import { WelcomeScreen }           from './components/WelcomeScreen'
import { CharacterCreationScreen }  from './components/CharacterCreationScreen'
import { SportSelectScreen }        from './components/SportSelectScreen'
import { AboutYouScreen }           from './components/AboutYouScreen'
import { YourRunningScreen }        from './components/YourRunningScreen'
import { GoalsScreen }              from './components/GoalsScreen'
import { YourLifeScreen }           from './components/YourLifeScreen'
import { GymConfigScreen }          from './components/GymConfigScreen'
import { TrainingPathScreen }       from './components/TrainingPathScreen'
import { PlanGenerationScreen }     from './components/PlanGenerationScreen'
import { PlanPreviewScreen }        from './components/PlanPreviewScreen'

function OnboardingFlow() {
  const { step } = useOnboarding()

  switch (step) {
    case 1:  return <WelcomeScreen />
    case 2:  return <CharacterCreationScreen />
    case 3:  return <SportSelectScreen />
    case 4:  return <AboutYouScreen />
    case 5:  return <YourRunningScreen />
    case 6:  return <GoalsScreen />
    case 7:  return <YourLifeScreen />
    case 8:  return <GymConfigScreen />
    case 9:  return <TrainingPathScreen />
    case 10: return <PlanGenerationScreen />
    case 11: return <PlanPreviewScreen />
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
