import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import PageLoading from '../shell/PageLoading'
import CaseAcademyHub from './CaseAcademyHub'
import { getNextPaperLab, resolvePaperLabRoute } from './paperLabsRegistry'
import { PaperLessonProvider } from './shared/PaperLessonContext'

type Go = (page: string, options?: Record<string, string>) => void

export default function PaperLabsPage({ paperId, go }: { paperId?: string; go: Go }) {
  const resolved = resolvePaperLabRoute(paperId)
  if (resolved.kind === 'hub') return <CaseAcademyHub go={go} />

  const { lab, unknown } = resolved
  const nextLab = getNextPaperLab(lab.paperId)
  const Lab = lab.component
  return (
    <section className='paper-labs-page is-golden-lesson'>
      <button type='button' className='paper-lab-back' onClick={() => go('paper-lab')}><ArrowLeft aria-hidden='true' />返回案例课程目录</button>
      {unknown ? <aside className='paper-lab-notice' role='status'>未找到“{paperId}”对应课程，已安全回退到第一课。</aside> : null}
      <PaperLessonProvider paperId={lab.paperId} nextPaperId={nextLab?.paperId} go={go}>
        <Suspense fallback={<PageLoading />}><Lab /></Suspense>
      </PaperLessonProvider>
    </section>
  )
}
