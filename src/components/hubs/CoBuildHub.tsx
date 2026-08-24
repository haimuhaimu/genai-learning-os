import {
  ArrowRight,
  BookOpenCheck,
  Bug,
  Clock3,
  ExternalLink as ExternalLinkIcon,
  FileText,
  GitPullRequest,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Wrench,
} from 'lucide-react'
import ExternalLink from '../shell/ExternalLink'

const repository = 'https://github.com/haimuhaimu/genai-learning-os'
const links = {
  content: `${repository}/issues/new?template=content_suggestion.yml`,
  video: `${repository}/issues/new?template=video_resource.yml`,
  bug: `${repository}/issues/new?template=bug_report.yml`,
  strategy: `${repository}/issues/new?template=strategy_case.yml`,
  maintenance: `${repository}/issues/new?template=maintenance.yml`,
  goodFirstIssue: `${repository}/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22`,
  contributing: `${repository}/blob/main/CONTRIBUTING.md`,
  caseAuthoring: `${repository}/blob/main/docs/CASE_AUTHORING.md`,
  example: `${repository}/tree/main/examples/strategy-case`,
  roadmap: `${repository}/blob/main/ROADMAP.md`,
  security: `${repository}/security/policy`,
}

function LinkCta({ href, label, quiet = false }: { href: string; label: string; quiet?: boolean }) {
  return (
    <ExternalLink className={quiet ? 'is-quiet' : undefined} href={href} accessibleName={label}>
      {label}<ExternalLinkIcon aria-hidden='true' />
    </ExternalLink>
  )
}

export default function CoBuildHub({ onFeedback }: { onFeedback: (trigger: HTMLButtonElement) => void }) {
  return (
    <section className='co-build-hub'>
      <header className='co-build-hero'>
        <div className='co-build-hero-copy'>
          <span><HeartHandshake aria-hidden='true' />学习者共建中心</span>
          <h1>不必先成为专家，<br /><em>从一次真实反馈开始。</em></h1>
          <p>你遇到的卡点、验证过的资源和做过的产品判断，都能让下一位学习者少走一步弯路。选择符合当前时间与经验的路径，表单里已经准备好最小信息结构。</p>
          <div className='co-build-actions'>
            <button type='button' onClick={(event) => onFeedback(event.currentTarget)}><MessageCircle aria-hidden='true' />用 1 分钟反馈</button>
            <LinkCta href={links.goodFirstIssue} label='查看 good first issue' quiet />
          </div>
        </div>
        <aside aria-label='共建原则'>
          <Sparkles aria-hidden='true' />
          <strong>贡献不是一次考试</strong>
          <p>先把问题说清楚，再决定是否实现。小修正、来源补充和维护工作，与完整 Strategy Case 同样重要。</p>
          <small>无需登录站内账号 · 不收集学习进度 · GitHub 操作由你主动发起</small>
        </aside>
      </header>

      <section className='co-build-paths' aria-labelledby='co-build-paths-title'>
        <header><span>三层贡献路径</span><h2 id='co-build-paths-title'>现在有多少时间，就走多远</h2><p>每条路径都有可以立刻使用的入口，不必先理解整个代码库。</p></header>
        <div>
          <article>
            <header><span>01</span><MessageCircle aria-hidden='true' /><small><Clock3 aria-hidden='true' />约 1 分钟</small></header>
            <h3>指出一个真实卡点</h3>
            <p>记录哪里难懂、哪里与预期不符，或哪个解释让你形成了判断。</p>
            <ul><li>不要求给出解决方案</li><li>页面深链和复现步骤最有帮助</li></ul>
            <footer>
              <button type='button' onClick={(event) => onFeedback(event.currentTarget)}>打开站内反馈<ArrowRight aria-hidden='true' /></button>
              <LinkCta href={links.content} label='提交内容建议' quiet />
              <LinkCta href={links.bug} label='报告 Bug' quiet />
            </footer>
          </article>
          <article>
            <header><span>02</span><PenLine aria-hidden='true' /><small><Clock3 aria-hidden='true' />约 30 分钟</small></header>
            <h3>补一段内容或资源</h3>
            <p>修正术语、补来源、推荐能解决决策卡点的资源，或完成一个边界清楚的维护任务。</p>
            <ul><li>区分事实、教学近似与观点</li><li>写清“为什么值得加入”</li></ul>
            <footer>
              <LinkCta href={links.content} label='建议课程内容' />
              <LinkCta href={links.video} label='推荐参考视频' quiet />
              <LinkCta href={links.maintenance} label='提议工程维护' quiet />
            </footer>
          </article>
          <article>
            <header><span>03</span><Lightbulb aria-hidden='true' /><small><Clock3 aria-hidden='true' />深度共建</small></header>
            <h3>共创一个 Strategy Case</h3>
            <p>从业务目标出发，用固定证据、代价账本和反馈闭环构造可复现的策略判断。</p>
            <ul><li>可以先提案，不必直接写代码</li><li>实现从类型安全的最小示例开始</li></ul>
            <footer>
              <LinkCta href={links.strategy} label='提议 Strategy Case' />
              <LinkCta href={links.caseAuthoring} label='阅读作者指南' quiet />
              <LinkCta href={links.example} label='查看最小示例' quiet />
            </footer>
          </article>
        </div>
      </section>

      <section className='co-build-first' aria-labelledby='co-build-first-title'>
        <header><span>首次贡献</span><h2 id='co-build-first-title'>四步完成一次可验证的贡献</h2></header>
        <ol>
          <li><b>1</b><div><ListChecks aria-hidden='true' /><h3>选一个明确问题</h3><p>从开放的新手任务开始，先确认范围与验收标准。</p><LinkCta href={links.goodFirstIssue} label='搜索 good first issue' /></div></li>
          <li><b>2</b><div><BookOpenCheck aria-hidden='true' /><h3>对齐贡献约定</h3><p>确认公开边界、分支方式、视觉与内容规范。</p><LinkCta href={links.contributing} label='阅读 CONTRIBUTING' /></div></li>
          <li><b>3</b><div><Wrench aria-hidden='true' /><h3>做最小改动并验证</h3><p>保持变更聚焦，按指南运行对应检查并记录结果。</p><span>代码 · 内容 · 文档都要可复核</span></div></li>
          <li><b>4</b><div><GitPullRequest aria-hidden='true' /><h3>提交可评审的 PR</h3><p>说明动机、用户可见变化、验证结果与署名偏好。</p><span>维护者会按证据而非资历评审</span></div></li>
        </ol>
      </section>

      <div className='co-build-policy-grid'>
        <section aria-labelledby='co-build-credit-title'>
          <header><UserRoundCheck aria-hidden='true' /><span>署名机制</span></header>
          <h2 id='co-build-credit-title'>你的贡献，以你选择的名字被看见</h2>
          <p>PR 模板提供“贡献者显示名”和“个人主页（可选）”。不填写显示名时默认使用 GitHub 用户名；主页留空不会影响评审。合并后，署名可随相关内容或发布记录展示。</p>
          <LinkCta href={links.contributing} label='查看署名与贡献说明' />
        </section>
        <section aria-labelledby='co-build-boundary-title'>
          <header><ShieldCheck aria-hidden='true' /><span>Roadmap / 公开边界</span></header>
          <h2 id='co-build-boundary-title'>方向公开，敏感信息不公开</h2>
          <p>Roadmap 说明维护方向但不承诺日期。Issue 和 PR 不得包含真实账号数据、私有日志、访问凭据、内部域名或未公开漏洞；安全问题请走私密报告渠道。</p>
          <div><LinkCta href={links.roadmap} label='查看 ROADMAP' /><LinkCta href={links.security} label='阅读 SECURITY' quiet /></div>
        </section>
      </div>

      <section className='co-build-quick-links' aria-labelledby='co-build-links-title'>
        <header><span>直接行动</span><h2 id='co-build-links-title'>已经知道要做什么？</h2></header>
        <div>
          <LinkCta href={links.bug} label='Bug' />
          <LinkCta href={links.video} label='参考视频' />
          <LinkCta href={links.maintenance} label='工程维护' />
          <LinkCta href={links.strategy} label='Strategy Case' />
        </div>
        <p><FileText aria-hidden='true' />所有公开提交都应只包含可公开、可核验的信息。<Bug aria-hidden='true' />安全漏洞不要提交公开 Issue。</p>
      </section>
    </section>
  )
}
