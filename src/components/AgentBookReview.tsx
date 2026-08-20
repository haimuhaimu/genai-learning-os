import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import type { AgentBookChapterId, AgentBookReviewId } from '../agentBookData'
import { agentBookDisclaimer, agentBookReviewProgressKey, chapterProgressKey } from '../agentBookData'
import { markProgress, readProgress, stageLabels } from '../progress'

type Props = {
  go: (page: string, options?: { chapter?: string; experiment?: string }) => void
}

type ReviewCard = {
  id: AgentBookReviewId
  title: string
  subtitle: string
  relatedChapters: AgentBookChapterId[]
  vetoLabel?: string
  rubric: { id: string; text: string }[]
}

const cards: ReviewCard[] = [
  {
    id: 'refund-rubric',
    title: '评审卡 R1：客服退款 Rubric + veto',
    subtitle: '把“业务可靠”与“底线”分离：Pass^k 是可靠，veto 是底线。',
    relatedChapters: ['ch7', 'ch9'],
    vetoLabel: 'veto：是否编造不存在的订单/金额/规则（出现一次即失败）',
    rubric: [
      { id: 'correctness', text: '操作正确性：金额/订单号/到账方式正确，可被工具结果或真值证明' },
      { id: 'policy', text: '政策合规：退款在规则内（例如时限/权益/凭证）' },
      { id: 'evidence', text: '证据指针：能引用 tool result 或规则条款，而不是“我认为”' },
      { id: 'communication', text: '用户沟通：解释清楚流程、时间、失败分支与下一步' },
    ],
  },
  {
    id: 'coding-min-tools',
    title: '评审卡 R2：Coding Agent 最小工具集评审',
    subtitle: 'Coding Agent = 通用 Agent 核心：七个最小工具 + 文件系统中枢。',
    relatedChapters: ['ch5'],
    rubric: [
      { id: 'seven', text: '是否具备七个最小工具：bash/read/write/edit/glob/grep + code interpreter' },
      { id: 'fs', text: '是否把文件系统当中枢：产物、日志、回归集、回滚点可落盘' },
      { id: 'verify', text: '是否有 Verify：至少一种自动验证（测试/类型检查/静态检查/样例校验）' },
      { id: 'recover', text: '是否有 Correct：失败分类 + 有界重试 + 熔断 + 回滚' },
    ],
  },
  {
    id: 'multi-agent-topology',
    title: '评审卡 R3：多 Agent 拓扑选择',
    subtitle: '选拓扑不是选“人数”：共享/隔离 × 对等/管理者/去中心化。',
    relatedChapters: ['ch10', 'ch6'],
    rubric: [
      { id: 'newinfo', text: '是否明确“新信息来源”：执行反馈/视觉反馈/工具验证/用户反馈' },
      { id: 'share', text: '是否决定上下文共享策略：共享（低成本） vs 隔离（权限/并发/成本）' },
      { id: 'topology', text: '是否给出拓扑理由：对等/管理者/去中心化各自适用场景' },
      { id: 'budget', text: '是否设置预算与终止：并发不等于无限；需要验证器决定停' },
    ],
  },
  {
    id: 'kv-cache-scan',
    title: '评审卡 R4：KV Cache 违规扫描（上下文工程）',
    subtitle: '把“缓存友好”变成可检查清单：system+tools 字节级稳定，动态追加末尾。',
    relatedChapters: ['ch2'],
    rubric: [
      { id: 'stable', text: 'system prompt 是否稳定（避免动态改写）' },
      { id: 'tools', text: 'tools schema 是否稳定（避免动态排序/动态空格差异）' },
      { id: 'tail', text: '动态信息是否追加在末尾（例如 status bar），而不是插入历史中段' },
      { id: 'template', text: '是否遵循一致 Chat Template（角色/字段一致）' },
    ],
  },
  {
    id: 'post-training-shape',
    title: '评审卡 R5：后训练“先形后神”判断',
    subtitle: '数据与环境 > 算法；SFT 先立格式（形），RL 再学策略（神）。',
    relatedChapters: ['ch8'],
    rubric: [
      { id: 'env', text: '是否有可信评估/仿真环境（没有环境谈 RL 容易走偏）' },
      { id: 'shape', text: '是否先用 SFT 把输出格式/协议立稳（形）' },
      { id: 'reward', text: '奖励是否忠实、可验证，是否考虑 reward hacking 风险' },
      { id: 'regression', text: '是否有保留集回归与可回滚灰度' },
    ],
  },
]

function toCardId(raw?: string): AgentBookReviewId {
  const v = raw as AgentBookReviewId | undefined
  return cards.some((c) => c.id === v) ? (v as AgentBookReviewId) : 'refund-rubric'
}

function stageLabel(stage: number) {
  return stageLabels[Math.max(0, Math.min(4, stage)) as 0 | 1 | 2 | 3 | 4]
}

function updateQueryCard(card?: AgentBookReviewId) {
  // 非必做，但给 Review 页面一个稳定深链（不影响已有 page）
  const url = new URL(window.location.href)
  if (card) url.searchParams.set('card', card)
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`)
}

export default function AgentBookReview({ go }: Props) {
  const [active, setActive] = useState<AgentBookReviewId>(() => toCardId(new URLSearchParams(window.location.search).get('card') || undefined))
  const [progress, setProgress] = useState(() => readProgress())

  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [vetoTriggered, setVetoTriggered] = useState(false)

  useEffect(() => {
    updateQueryCard(active)
    setChecks({})
    setVetoTriggered(false)
  }, [active])

  useEffect(() => {
    const onChange = () => setProgress(readProgress())
    window.addEventListener('genai-progress-change', onChange)
    return () => window.removeEventListener('genai-progress-change', onChange)
  }, [])

  const card = useMemo(() => cards.find((c) => c.id === active) ?? cards[0], [active])

  const doneStage = progress[agentBookReviewProgressKey(card.id)] ?? 0

  const allChecked = card.rubric.every((r) => checks[r.id])
  const canPass = allChecked && !vetoTriggered

  const markReviewed = () => {
    if (!canPass) return
    markProgress(agentBookReviewProgressKey(card.id), 4)
    for (const ch of card.relatedChapters) markProgress(chapterProgressKey(ch), 4)
    setProgress(readProgress())
  }

  return (
    <div className='agent-book-scope'>
      <header className='agent-book-hero'>
        <div>
          <h1>Agent Book · 评审卡</h1>
          <p>把“我觉得懂了”变成可评审结论：Rubric + veto + 可回滚的最小改动思维。</p>
        </div>
        <div className='agent-book-hero-actions'>
          <span className='agent-book-pill'>
            <ClipboardCheck size={16} />
            <b>{cards.length}</b> 张卡
          </span>
          <button className='agent-book-action-btn' onClick={() => go('agent-book')}>
            <BookOpen size={16} />
            返回课程
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <div className='agent-book-callout'>
        <b>引用声明：</b>
        {agentBookDisclaimer}
      </div>

      <div className='agent-book-shell' style={{ marginTop: 14 }}>
        <aside className='agent-book-rail'>
          <h2>评审目录</h2>
          <div className='agent-book-rail-sub'>完成一张卡会同时把关联章节标记为“已评审”。</div>
          <nav>
            {cards.map((c) => {
              const stage = progress[agentBookReviewProgressKey(c.id)] ?? 0
              return (
                <button key={c.id} className={`agent-book-nav-btn ${c.id === active ? 'active' : ''}`} onClick={() => setActive(c.id)}>
                  <span className='left'>
                    <b>{c.id}</b>
                    <span>{c.title}</span>
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
              <h2>{card.title}</h2>
              <div className='agent-book-subtitle'>{card.subtitle}</div>
              <div className='agent-book-footnote'>关联章节：{card.relatedChapters.join('、')}</div>
            </div>
            <div className='agent-book-actions'>
              <button className={`agent-book-action-btn primary`} onClick={markReviewed} disabled={!canPass}>
                <CheckCircle2 size={16} />
                标记已评审
              </button>
              <button className='agent-book-action-btn' onClick={() => go('agent-book-lab')}>
                <Flask size={16} />
                去做实验
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className='agent-book-footnote'>当前卡片进度：{stageLabel(doneStage)}</div>

          <hr className='agent-book-divider' />

          <div className='agent-book-grid'>
            <section className='agent-book-card'>
              <h3>
                <SlidersHorizontal size={16} style={{ marginRight: 8 }} />
                Rubric（勾满才算通过）
              </h3>
              <ul style={{ paddingLeft: 0, listStyle: 'none', marginTop: 10 }}>
                {card.rubric.map((r) => (
                  <li key={r.id} style={{ marginTop: 10 }}>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                      <input type='checkbox' checked={!!checks[r.id]} onChange={(e) => setChecks((p) => ({ ...p, [r.id]: e.target.checked }))} style={{ marginTop: 3 }} />
                      <span style={{ lineHeight: 1.45, color: 'rgba(31,39,50,.84)' }}>{r.text}</span>
                    </label>
                  </li>
                ))}
              </ul>

              {card.vetoLabel && (
                <div className='agent-book-callout' style={{ marginTop: 12 }}>
                  <b>
                    <ShieldAlert size={16} style={{ marginRight: 8 }} />
                    veto（一票否决）
                  </b>
                  <div style={{ marginTop: 8, lineHeight: 1.6 }}>{card.vetoLabel}</div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                    <input type='checkbox' checked={vetoTriggered} onChange={(e) => setVetoTriggered(e.target.checked)} />
                    <span style={{ color: 'rgba(31,39,50,.78)' }}>我在案例中观察到了 veto 现象</span>
                  </label>
                  <div className='agent-book-footnote'>如果勾选 veto，则本卡必定不通过（不能标记已评审）。</div>
                </div>
              )}
            </section>

            <section className='agent-book-card'>
              <h3>判定与建议</h3>
              <div style={{ marginTop: 10, lineHeight: 1.65, color: 'rgba(31,39,50,.82)' }}>
                当前状态：
                <span className='agent-book-stage' style={{ marginLeft: 8 }}>
                  {canPass ? '通过' : vetoTriggered ? 'veto 触发（失败）' : allChecked ? '差一步：请确认 veto 未触发' : '未满足 Rubric'}
                </span>
              </div>
              <ul style={{ marginTop: 10 }}>
                <li>
                  通过不是“感觉”：需要证据（Verify）和可解释口径（Rubric）。
                </li>
                <li>
                  如果未通过：优先做最小 diff 修复，并准备边界集/保留集，确保可回滚。
                </li>
                <li>
                  多数底线问题先用 Harness（门禁/验证器）兜住，再谈模型或训练。
                </li>
              </ul>
            </section>
          </div>

          <div className='agent-book-footnote' style={{ marginTop: 14 }}>
            Review 页面支持附加参数：<code style={{ marginLeft: 8 }}>?page=agent-book-review&amp;card={active}</code>（可选）
          </div>
        </article>
      </div>
    </div>
  )
}

function Flask({ size }: { size: number }) {
  // 这里避免引入新图标名（可能不存在）；用简化占位图标
  return (
    <span style={{ width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      <span style={{ width: size - 6, height: size - 6, borderRadius: 8, background: 'rgba(16,185,129,0.22)', border: '1px solid rgba(16,185,129,0.35)' }} />
    </span>
  )
}
