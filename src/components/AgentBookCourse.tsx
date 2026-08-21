import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, FlaskConical, Tag, TrendingUp } from 'lucide-react'
import type { AgentBookChapter, AgentBookChapterId } from '../agentBookData'
import { agentBookChapters, agentBookDisclaimer, chapterProgressKey } from '../agentBookData'
import { markProgress, readProgress, stageLabels } from '../progress'

type Props = {
  initialChapter?: string
  go: (page: string, options?: { chapter?: string; experiment?: string; case?: string }) => void
}

function toChapterId(raw?: string): AgentBookChapterId {
  const id = raw as AgentBookChapterId | undefined
  const ok = agentBookChapters.some((c) => c.id === id)
  return ok ? (id as AgentBookChapterId) : 'ch1'
}

function stageLabel(stage: number) {
  return stageLabels[Math.max(0, Math.min(4, stage)) as 0 | 1 | 2 | 3 | 4]
}

function updateQueryChapter(chapter: AgentBookChapterId) {
  const url = new URL(window.location.href)
  url.searchParams.set('chapter', chapter)
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`)
}

function formatTag(tag: string) {
  const map: Record<string, string> = {
    'context-engineering': '上下文工程',
    'kv-cache': 'KV Cache',
    'prompt-cache': 'Prompt Cache',
    'stable-prefix': '稳定前缀',
    'chat-template': 'Chat Template',
    'status-bar': 'Status Bar',
    harness: 'Harness',
    'proposer-reviewer': '提议者-审核者',
    'progressive-disclosure': '渐进式披露',
    'append-only': '只增不改',
    'boundary-set': '边界集',
    'retention-set': '保留集',
    'minimal-diff': '最小 diff',
    reversible: '可回滚',
    'pass-at-k': 'Pass@k',
    'pass-k': 'Pass^k',
    veto: 'veto',
    'coding-agent-core': 'Coding Agent 核心',
    'seven-tools': '七个最小工具',
    'filesystem-hub': '文件系统中枢',
    'new-info-criterion': '新信息判据',
    'three-layer-verify': '三层验证',
    'observation-space': '观察空间',
    'action-space': '动作空间',
    'event-driven': '事件驱动',
    'post-training': '后训练',
    'shape-then-spirit': '先形后神',
  }
  return map[tag] ?? tag
}

export default function AgentBookCourse({ initialChapter, go }: Props) {
  const [active, setActive] = useState<AgentBookChapterId>(() => toChapterId(initialChapter))
  const [progress, setProgress] = useState(() => readProgress())
  const [microAnswer, setMicroAnswer] = useState<string>('')
  const [microChecked, setMicroChecked] = useState(false)

  useEffect(() => {
    setActive(toChapterId(initialChapter))
  }, [initialChapter])

  useEffect(() => {
    // 打开章节即视作“已浏览”
    markProgress(chapterProgressKey(active), 1)
    updateQueryChapter(active)
    setMicroAnswer('')
    setMicroChecked(false)
  }, [active])

  useEffect(() => {
    const onChange = () => setProgress(readProgress())
    window.addEventListener('genai-progress-change', onChange)
    return () => window.removeEventListener('genai-progress-change', onChange)
  }, [])

  const chapter = useMemo<AgentBookChapter>(() => {
    return agentBookChapters.find((c) => c.id === active) ?? agentBookChapters[0]
  }, [active])

  const chapterStage = progress[chapterProgressKey(active)] ?? 0

  const tagToChapter = useMemo(() => {
    const m = new Map<string, AgentBookChapterId[]>()
    for (const c of agentBookChapters) {
      for (const t of c.tags) {
        const list = m.get(t) ?? []
        list.push(c.id)
        m.set(t, list)
      }
    }
    return m
  }, [])

  const relatedChapters = useMemo(() => {
    const related = new Set<AgentBookChapterId>()
    for (const t of chapter.tags) {
      for (const id of tagToChapter.get(t) ?? []) {
        if (id !== chapter.id) related.add(id)
      }
    }
    return Array.from(related)
  }, [chapter.id, chapter.tags, tagToChapter])

  const handleTagJump = (tag: string) => {
    const list = tagToChapter.get(tag) ?? []
    const next = list.find((id) => id !== chapter.id)
    if (next) setActive(next)
  }

  const checkMicroCalc = () => {
    if (!chapter.microCalc) return
    const raw = Number(microAnswer)
    if (Number.isNaN(raw)) {
      setMicroChecked(true)
      return
    }
    const ok = Math.abs(raw - chapter.microCalc.answer) <= chapter.microCalc.tolerance
    setMicroChecked(true)
    if (ok) markProgress(chapterProgressKey(active), 2)
  }

  return (
    <div className='agent-book-scope'>
      <header className='agent-book-hero'>
        <div>
          <h1>Agent Book · 硬核路线</h1>
          <p>
            这是对现有「Agent 系统专家课」的深度扩展：把《AI Agent 手册》的 10 章关键论断、公式与实验意图，重组为可
            交互的课程/实验/评审。
          </p>
        </div>
        <div className='agent-book-hero-actions'>
          <span className='agent-book-pill'>
            <BookOpen size={16} />
            <b>10</b> 章
          </span>
          <span className='agent-book-pill'>
            <FlaskConical size={16} />
            <b>6</b> 个浏览器内机制实验
          </span>
          <span className='agent-book-pill'>
            <TrendingUp size={16} />
            <b>{Math.max(0, Math.min(4, chapterStage))}</b>/4 {stageLabel(chapterStage)}
          </span>
          <button type='button' className='strategy-route-entry' onClick={() => go('strategy-case', { case: 'new-information' })}>该路线策略案例<ArrowRight size={15} /></button>
        </div>
      </header>

      <div className='agent-book-shell'>
        <aside className='agent-book-rail'>
          <h2>章节目录</h2>
          <div className='agent-book-rail-sub'>按章学习（支持深链：?page=agent-book&chapter=ch3）</div>
          <nav>
            {agentBookChapters.map((c, idx) => {
              const stage = progress[chapterProgressKey(c.id)] ?? 0
              return (
                <button
                  key={c.id}
                  className={`agent-book-nav-btn ${c.id === active ? 'active' : ''}`}
                  onClick={() => setActive(c.id)}
                >
                  <span className='left'>
                    <b>CH{idx + 1}</b>
                    <span>{c.titleZh}</span>
                  </span>
                  <span className='right'>
                    <span className='agent-book-stage'>{stageLabel(stage)}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <article className='agent-book-main'>
          <div className='agent-book-main-header'>
            <div>
              <h2>
                {chapter.titleZh} <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(31,39,50,.58)' }}>· {chapter.titleEn}</span>
              </h2>
              <div className='agent-book-subtitle'>
                <b>一句话：</b>
                {chapter.oneLiner}
                <br />
                <b>主题：</b>
                {chapter.theme}
              </div>
            </div>
            <div className='agent-book-actions'>
              <button className='agent-book-action-btn primary' onClick={() => {
                markProgress(chapterProgressKey(active), 3)
                go('agent-book-lab', {
                  experiment:
                    active === 'ch2'
                      ? 'kv-cache'
                      : active === 'ch7'
                        ? 'pass-at-k'
                        : active === 'ch9'
                          ? 'evolution-router'
                          : active === 'ch10'
                            ? 'new-info-criterion'
                            : active === 'ch1'
                              ? 'harness-diagnose'
                              : 'status-bar',
                })
              }}>
                <FlaskConical size={16} />
                去做关联实验
                <ArrowRight size={14} />
              </button>
              <button className='agent-book-action-btn' onClick={() => go('agent-book-review')}>
                <BookOpen size={16} />
                去做评审卡
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className='agent-book-callout'>
            <b>引用声明：</b>
            {agentBookDisclaimer}
          </div>

          <hr className='agent-book-divider' />

          <div className='agent-book-grid'>
            <section className='agent-book-card'>
              <h3>① 作者主张（可争论的立场）</h3>
              <ul>
                {chapter.stances.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className='agent-book-tag-row'>
                {chapter.tags.slice(0, 10).map((t) => (
                  <button key={t} className='agent-book-tag' onClick={() => handleTagJump(t)} title='点击跳到同标签的另一章'>
                    <Tag size={14} /> {formatTag(t)}
                  </button>
                ))}
              </div>
              {relatedChapters.length > 0 && (
                <div className='agent-book-footnote'>
                  <b>同标签关联章节：</b>
                  {relatedChapters.map((id) => {
                    const c = agentBookChapters.find((x) => x.id === id)
                    return c ? (
                      <button
                        key={id}
                        className='agent-book-tag'
                        onClick={() => setActive(id)}
                        style={{ marginLeft: 8 }}
                      >
                        {c.titleZh}
                      </button>
                    ) : null
                  })}
                </div>
              )}
            </section>

            <section className='agent-book-card'>
              <h3>② 概念地图（你应该能复述的名词）</h3>
              <ul>
                {chapter.coreConcepts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className='agent-book-footnote'>
                建议你用一句话解释每个概念的“输入/输出/失败模式”，并能说清它属于 Harness 的哪一段（Context / Tools / Constrain / Verify / Correct）。
              </div>
            </section>

            <section className='agent-book-card'>
              <h3>③ 公式与经验（可手算、可落地的“硬东西”）</h3>
              <ul>
                {chapter.heuristics.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              {chapter.formulas.map((f) => (
                <div key={f.title} style={{ marginTop: 10 }}>
                  <b style={{ fontSize: 12, color: 'rgba(31,39,50,.86)' }}>{f.title}</b>
                  <div className='agent-book-formula'>{f.content}</div>
                  {f.note ? <div className='agent-book-footnote'>{f.note}</div> : null}
                </div>
              ))}
            </section>

            <section className='agent-book-card'>
              <h3>④ 评审与诊断（把理解变成可验证的结论）</h3>
              <ul>
                {chapter.learningModes.map((m) => (
                  <li key={m.id}>
                    <b>{m.title}</b>
                    <div style={{ marginTop: 6, color: 'rgba(31,39,50,.76)' }}>
                      {m.bullets.map((b) => (
                        <div key={b}>· {b}</div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              {chapter.microCalc ? (
                <div className='agent-book-microcalc'>
                  <b>微型练习（用于进度“已手算”）：</b>
                  <div style={{ marginTop: 8, color: 'rgba(31,39,50,.82)', lineHeight: 1.6 }}>{chapter.microCalc.question}</div>
                  <label>
                    你的答案（数字）：
                    <input className='agent-book-input' value={microAnswer} onChange={(e) => setMicroAnswer(e.target.value)} placeholder='例如：0.512' />
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    <button className='agent-book-action-btn' onClick={checkMicroCalc}>校验并标记已手算</button>
                    <button className='agent-book-action-btn' onClick={() => setMicroAnswer('')}>清空</button>
                  </div>
                  {microChecked ? (
                    <div className='agent-book-footnote'>
                      <b>提示：</b>
                      {chapter.microCalc.hint}
                      <br />
                      <b>步骤：</b>
                      {chapter.microCalc.steps.join(' → ')}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <hr className='agent-book-divider' />

              <b>配套实验（引用目录名 + 意图，不复制代码）：</b>
              <ul style={{ marginTop: 8 }}>
                {chapter.experiments.map((e) => (
                  <li key={e.code}>
                    <b>{e.code}</b> · <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{e.directory}</span>
                    {e.difficulty ? ` · ${e.difficulty}` : ''}
                    <div style={{ color: 'rgba(31,39,50,.74)', marginTop: 4 }}>{e.intent}</div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className='agent-book-footnote'>
            章节深链示例：
            <code style={{ marginLeft: 8 }}>?page=agent-book&amp;chapter={active}</code>
          </div>
        </article>
      </div>
    </div>
  )
}
