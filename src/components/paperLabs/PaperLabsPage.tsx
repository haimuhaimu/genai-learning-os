import { Suspense } from 'react'
import { ArrowLeft, BookOpen, FlaskConical } from 'lucide-react'
import { paperResources } from '../../resources/paperCatalog'
import PageLoading from '../shell/PageLoading'
import { getPaperLab, paperLabs } from './paperLabsRegistry'

type Go = (page: string, options?: Record<string, string>) => void

export default function PaperLabsPage({ paperId, go }: { paperId?: string; go: Go }) {
  const lab = getPaperLab(paperId)
  const paper = paperResources.find((item) => item.id === lab.paperId)
  const unknown = Boolean(paperId && paperId !== lab.paperId)
  const Lab = lab.component
  return (
    <section className='paper-labs-page'>
      <button type='button' className='paper-lab-back' onClick={() => go('papers')}><ArrowLeft aria-hidden='true' />返回论文库</button>
      <header className='paper-lab-hero'>
        <span><FlaskConical aria-hidden='true' />{lab.eyebrow}</span>
        <h1>{lab.shortTitle}机制复现</h1>
        <p>{lab.objective}</p>
        {unknown ? <aside role='status'>未找到“{paperId}”对应实验，已安全回退到默认实验。</aside> : null}
        <div><b>{paper?.title}</b><span>{paper?.authors} · {paper?.year}</span><button type='button' onClick={() => paper?.relatedCaseIds[0] ? go('strategy-case', { case: paper.relatedCaseIds[0] }) : go('papers')}>回到关联 Strategy Case</button></div>
      </header>
      <nav className='paper-lab-tabs' aria-label='选择论文机制实验'>{paperLabs.map((item) => <button key={item.paperId} type='button' aria-current={item.paperId === lab.paperId ? 'page' : undefined} onClick={() => go('paper-lab', { paper: item.paperId })}>{item.shortTitle}</button>)}</nav>
      <section className='paper-lab-notice'><BookOpen aria-hidden='true' /><p><b>这是机制复现，不是完整论文复现。</b>所有计算在浏览器内用固定小样本确定性运行，不调用后端、模型 API 或训练服务。</p></section>
      <Suspense fallback={<PageLoading />}><Lab /></Suspense>
      <footer className='paper-lab-conclusion'><span>带回产品决策</span><p>{lab.conclusion}</p></footer>
    </section>
  )
}
