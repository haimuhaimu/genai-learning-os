import { useEffect, useState } from 'react'
import { JOURNEY_EVENT, JOURNEY_KEY, deriveJourneyStatus, readJourney } from '../../learningJourney'
import { BAYES_JOURNEY_EVENT, BAYES_JOURNEY_KEY, deriveBayesStatus, readBayesJourney } from '../../bayesJourney'
import { PROGRESS_CHANGE_EVENT, readProgress } from '../../progress'
import { CURRENT_JOURNEY_EVENT, CURRENT_JOURNEY_KEY, clearTemporaryJourney, readCurrentJourney, readTemporaryJourney, resolveJourneyResume } from '../../journeyResume'

function readSnapshot() {
  const temporary = readTemporaryJourney()
  return { model: readJourney(), bayes: readBayesJourney(), progress: readProgress(), preferred: temporary ?? readCurrentJourney(), temporary: temporary !== null }
}
export function useJourneyResume() {
  const [snapshot, setSnapshot] = useState(readSnapshot)
  useEffect(() => {
    const sync = () => setSnapshot(readSnapshot())
    const crossTab = (event: StorageEvent) => {
      if (event.key === CURRENT_JOURNEY_KEY || event.key === null) clearTemporaryJourney()
      if (event.key === null || [CURRENT_JOURNEY_KEY, JOURNEY_KEY, BAYES_JOURNEY_KEY, 'genai-learning-progress-v1'].includes(event.key)) sync()
    }
    const events = [CURRENT_JOURNEY_EVENT, JOURNEY_EVENT, BAYES_JOURNEY_EVENT, PROGRESS_CHANGE_EVENT]
    events.forEach(event => window.addEventListener(event, sync))
    window.addEventListener('storage', crossTab)
    sync()
    return () => {
      events.forEach(event => window.removeEventListener(event, sync))
      window.removeEventListener('storage', crossTab)
    }
  }, [])
  const resume = resolveJourneyResume(snapshot.preferred, snapshot.model, snapshot.bayes)
  const status = resume.current === 'bayes-learning' ? deriveBayesStatus(snapshot.progress, snapshot.bayes) : deriveJourneyStatus(snapshot.progress, snapshot.model)
  return { ...resume, status, temporary: snapshot.temporary }
}
