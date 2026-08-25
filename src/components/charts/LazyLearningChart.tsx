import { lazy, Suspense } from 'react'
import type { LearningChartProps } from './LearningChart'

const LearningChart = lazy(() => import('./LearningChart'))

export default function LazyLearningChart(props: LearningChartProps) {
  return <Suspense fallback={<div className='lo-chart-loading' role='status'>正在载入图表</div>}><LearningChart {...props} /></Suspense>
}
