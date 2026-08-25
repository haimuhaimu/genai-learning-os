import { agentBookChapters } from './agentBookData'
import { agentExpertModules } from './agentExpertData'
import { distillModules } from './distillData'
import { foundationNodes } from './foundationData'
import { visibleContentEntries } from './content/registry'
import { primarySections } from './navigation'

export type SearchDestination = {
  id: string
  group: string
  title: string
  subtitle: string
  keywords: string[]
  page: string
  options?: Record<string, string>
}

const sectionSubtitles: Record<string, string> = {
  'unified-map': '学习总览、个性化推荐与继续学习',
  routes: '按主题和层级选择结构化学习路线',
  'strategy-cases': '先做产品决策，再核对证据与代价',
  labs: '通过调整变量观察机制结果',
  toolbox: '统一发现视频与核心论文',
}

const topLevel: SearchDestination[] = primarySections.map((section) => ({
  id: `top-${section.page}`,
  group: '主要入口',
  title: section.label,
  subtitle: sectionSubtitles[section.page],
  keywords: [section.label, section.page],
  page: section.page,
}))

const utilityEntries: SearchDestination[] = [
  { id: 'top-videos', group: '直接入口', title: '参考视频库', subtitle: '按学习卡点补充机制资料', keywords: ['视频', '课程', '资源'], page: 'videos' },
  { id: 'top-papers', group: '直接入口', title: '核心论文讲解库', subtitle: '查看关键机制、产品视角与阅读问题', keywords: ['论文', 'paper', 'arxiv'], page: 'papers' },
  { id: 'top-reviews', group: '直接入口', title: '评审中心', subtitle: '方案、上线与可靠性评审', keywords: ['rubric', 'veto', '评审'], page: 'reviews' },
  { id: 'top-progress', group: '直接入口', title: '我的进度', subtitle: '本机学习记录与迁移', keywords: ['备份', '导入', '导出'], page: 'progress' },
  { id: 'top-handbook', group: '直接入口', title: '公式与指标手册', subtitle: '统一查询关键公式与指标', keywords: ['手册', '公式', '指标'], page: 'handbook' },
  { id: 'top-co-build', group: '直接入口', title: '学习者共建中心', subtitle: '从反馈到 Strategy Case，共建可验证的学习体验', keywords: ['共建', '贡献', '反馈', 'good first issue', 'Strategy Case'], page: 'co-build' },
]

const registryEntries: SearchDestination[] = visibleContentEntries.map((entry) => {
  const legacyId = 'legacyId' in entry ? entry.legacyId : entry.id.split(':').at(-1) ?? entry.id
  const id = entry.type === 'case'
    ? `strategy-${legacyId}`
    : entry.type === 'lab'
      ? entry.family === 'paper' ? `paper-lab-${legacyId}` : `lab-${entry.family}-${legacyId}`
      : `${entry.type}-${legacyId}`
  const resourceKeywords = entry.type === 'video'
    ? [entry.resource.org, entry.resource.speaker ?? '', entry.resource.whyWorthWatching, ...entry.resource.relatedRouteIds]
    : entry.type === 'paper'
      ? [entry.resource.authors, entry.resource.area, entry.resource.oneLine, entry.resource.problem, entry.resource.mechanism, entry.resource.productLens, entry.resource.readQuestion]
      : []
  return {
    id,
    group: { course: '学习路线', case: '策略案例', lab: '互动实验', video: '参考视频库', paper: '论文讲解库' }[entry.type],
    title: entry.title,
    subtitle: entry.summary,
    keywords: [legacyId, ...entry.tags, ...resourceKeywords],
    page: entry.route.page,
    options: entry.route.options,
  }
})

const foundation: SearchDestination[] = foundationNodes.map((node) => ({
  id: `foundation-${node.id}`, group: '算法基础', title: `${node.code} / ${node.title}`, subtitle: node.intuition,
  keywords: [node.formula, node.experiment, ...node.related], page: 'foundation', options: { node: node.id },
}))
const bookChapters: SearchDestination[] = agentBookChapters.map((chapter) => ({
  id: `agent-book-${chapter.id}`, group: 'Agent Book 十章', title: `${chapter.id.toUpperCase()} / ${chapter.titleZh}`, subtitle: chapter.oneLiner,
  keywords: [chapter.titleEn, chapter.theme, ...chapter.tags, ...chapter.coreConcepts], page: 'agent-book', options: { chapter: chapter.id },
}))
const distillCourses: SearchDestination[] = distillModules.map((module) => ({
  id: `distill-${module.id}`, group: '蒸馏课程', title: `${module.code} / ${module.title}`, subtitle: module.lead,
  keywords: [module.formula ?? '', ...module.mechanism], page: 'distill-course', options: { module: module.id },
}))
const agentCourses: SearchDestination[] = agentExpertModules.map((module) => ({
  id: `agent-expert-${module.id}`, group: 'Agent 专家课', title: `${module.no} / ${module.title}`, subtitle: module.subtitle,
  keywords: [module.formula, ...module.metrics], page: 'expert-agent', options: { module: module.id },
}))

export const searchIndex = [...topLevel, ...utilityEntries, ...registryEntries, ...foundation, ...bookChapters, ...distillCourses, ...agentCourses]
