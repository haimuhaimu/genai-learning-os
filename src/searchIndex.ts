import { agentBookChapters, agentBookLabIds } from './agentBookData'
import { agentExpertModules } from './agentExpertData'
import { distillExperiments, distillModules } from './distillData'
import { foundationNodes } from './foundationData'
import { flagshipCaseIds, strategyCaseCatalog } from './components/strategy/caseCatalog'
import { videoResources } from './resources/videoCatalog'

export type SearchDestination = {
  id: string
  group: string
  title: string
  subtitle: string
  keywords: string[]
  page: string
  options?: Record<string, string>
}

const topLevel: SearchDestination[] = [
  ['home', '首页', '统一学习地图', '学习入口 导航 首页', 'unified-map'],
  ['routes', '学习路线', '九条学习路线与前沿支线', '路径 课程', 'routes'],
  ['math-primer', '数学零层（Math Primer）：符号与基础概念扫盲', '不是数学课，把 AI 公式翻译成人话', '数学扫盲 数轴 实数 变量 函数 指数 对数 求和 Σ 平均值 期望 方差 概率 条件概率 向量 矩阵 点积 导数 梯度 参数 权重 Loss 分布 熵 KL', 'math-primer'],
  ['decision-math', 'AI 决策数学', '8 个 3–5 分钟案例：从数字到策略判断', '数学 概率 校准 贝叶斯 相似度 梯度 熵 KL 因果 奖励 误差传播', 'decision-math'],
  ['strategy-cases', '策略案例（Case）中心', 'Strategy-first：先做产品决策，再看证据、业务代价与反馈闭环', '策略 决策 case 证据 strategy-first product decisions trade-offs feedback loops 策略案例 业务代价', 'strategy-cases'],
  ['videos', '参考视频库（可选）', '先做策略决策，再按卡点补机制', '视频 课程 参考资源 机制 决策', 'videos'],
  ['labs', '实验室', '全部互动实验目录', '实验 lab', 'labs'],
  ['reviews', '评审中心', '方案、上线与可靠性评审', 'rubric veto', 'reviews'],
  ['progress', '我的进度', '本机学习记录与迁移', '备份 导入 导出', 'progress'],
  ['handbook', '公式与指标手册', '统一查询关键公式与指标', '手册 公式 指标', 'handbook'],
].map(([id, title, subtitle, keywords, page]) => ({ id: `top-${id}`, group: '顶级入口', title, subtitle, keywords: keywords.split(' '), page }))

const routes: SearchDestination[] = [
  ['foundation', '算法基础', '分布、优化、Transformer 与 MoE', '数学 机制'],
  ['decision-math', 'AI 决策数学', '校准、贝叶斯、相似度、优化、因果与序贯决策', 'ECE Beta cosine gradient KL A/B reward 状态转移'],
  ['expert-llm', 'LLM 系统', '训练、推理、服务和评估决策', 'KV Cache RAG'],
  ['expert-image', '图像生成', '扩散、控制与生产评估', 'Diffusion Flow'],
  ['expert-agent', 'Agent 系统', 'Loop、工具、记忆、安全与上线', '智能体 MCP'],
  ['agent-book', 'Agent Book', 'Context、Harness 与持续进化', 'AI Agent 手册'],
  ['distill-course', '模型蒸馏', '教师、数据、损失与上线闸门', 'KD Distillation'],
].map(([page, title, subtitle, keywords]) => ({ id: `route-${page}`, group: '学习路线', title, subtitle, keywords: keywords.split(' '), page }))

const foundation: SearchDestination[] = foundationNodes.map((node) => ({
  id: `foundation-${node.id}`,
  group: '算法基础',
  title: `${node.code} · ${node.title}`,
  subtitle: node.intuition,
  keywords: [node.formula, node.experiment, ...node.related],
  page: 'foundation',
  options: { node: node.id },
}))

const foundationLabMeta = [
  ['softmax-ce', 'Softmax & Cross-Entropy', 'logits、温度、概率、entropy 与交叉熵'],
  ['kl-divergence', 'KL / JS 分布比较', '方向性、mode-covering 与 mode-seeking'],
  ['gradient-descent', '梯度下降轨迹', '收敛、震荡、发散与梯度爆炸'],
  ['mlp-forward', 'MLP 前向与维度流', '激活、参数量、死神经元与 FLOPs'],
  ['transformer-block', 'Transformer Block', 'Pre/Post-LN、残差与 token mixing'],
  ['moe-router', 'MoE Router', 'Top-k、capacity、负载与 overflow'],
  ['case-overconfident', '一次上线策略，如何改变模型学到什么？', '冷启动、作者触达与风险治理中的策略、反馈和训练数据'],
]
const foundationLabs: SearchDestination[] = foundationLabMeta.map(([id, title, subtitle]) => ({
  id: `foundation-lab-${id}`, group: '算法基础实验', title, subtitle, keywords: [id, '基础实验', ...(id === 'case-overconfident' ? ['上线策略', '冷启动', '流量分配', '作者触达', '风险治理', '人工复核', '反馈样本', '交叉熵', '阈值', '预算'] : [])], page: 'foundation-lab', options: { experiment: id },
}))

const bookChapters: SearchDestination[] = agentBookChapters.map((chapter) => ({
  id: `agent-book-${chapter.id}`,
  group: 'Agent Book 十章',
  title: `${chapter.id.toUpperCase()} · ${chapter.titleZh}`,
  subtitle: chapter.oneLiner,
  keywords: [chapter.titleEn, chapter.theme, ...chapter.tags, ...chapter.coreConcepts],
  page: 'agent-book',
  options: { chapter: chapter.id },
}))

const bookLabTitles: Record<(typeof agentBookLabIds)[number], string> = {
  'harness-diagnose': 'Harness 五要素诊断',
  'kv-cache': 'KV Cache 反模式模拟',
  'status-bar': 'Status Bar 沙盘',
  'pass-at-k': 'Pass@k vs Pass^k',
  'new-info-criterion': '多 Agent 新信息判据',
  'evolution-router': '持续进化更新路由',
}
const bookLabs: SearchDestination[] = agentBookLabIds.map((id) => ({
  id: `agent-book-lab-${id}`, group: 'Agent Book 实验', title: bookLabTitles[id], subtitle: '可运行的 Agent 工程机制实验', keywords: [id, 'Agent Book'], page: 'agent-book-lab', options: { experiment: id },
}))

const distillCourses: SearchDestination[] = distillModules.map((module) => ({
  id: `distill-${module.id}`, group: '蒸馏课程', title: `${module.code} · ${module.title}`, subtitle: module.lead, keywords: [module.formula ?? '', ...module.mechanism], page: 'distill-course', options: { module: module.id },
}))
const distillLabs: SearchDestination[] = distillExperiments.map(([id, code, title]) => ({
  id: `distill-lab-${id}`, group: '蒸馏实验', title: `${code} · ${title}`, subtitle: '模型蒸馏互动实验', keywords: [id, 'KD 蒸馏'], page: 'distill-lab', options: { experiment: id },
}))

const agentCourses: SearchDestination[] = agentExpertModules.map((module) => ({
  id: `agent-expert-${module.id}`, group: 'Agent 专家课', title: `${module.no} · ${module.title}`, subtitle: module.subtitle, keywords: [module.formula, ...module.metrics], page: 'expert-agent', options: { module: module.id },
}))
const agentLabMeta = [
  ['loop-simulator', 'Loop Simulator'], ['tool-contract', 'Tool Contract'], ['planner-executor', 'Planner / Executor'], ['memory-governance', 'Memory Governance'],
  ['security-gate', 'Security Gate'], ['multi-agent', 'Multi-Agent'], ['observability', 'Observability'], ['launch-gate', 'Launch Gate'],
]
const agentLabs: SearchDestination[] = agentLabMeta.map(([id, title]) => ({
  id: `agent-lab-${id}`, group: 'Agent 专家实验', title, subtitle: 'Agent 系统机制实验', keywords: [id, '智能体 Agent'], page: 'agent-lab', options: { experiment: id },
}))

const reviewAndManual: SearchDestination[] = [
  { id: 'review-evaluation', group: '评审与手册', title: '方案是否值得做', subtitle: '目标、能力边界、成本与评测证据', keywords: ['方案评估'], page: 'evaluation' },
  { id: 'review-launch', group: '评审与手册', title: '系统是否可以上线', subtitle: '可靠性、安全、回滚与 Launch Gate', keywords: ['上线评审'], page: 'distill-lab', options: { experiment: 'launch-gate' } },
  { id: 'review-agent', group: '评审与手册', title: 'Agent 可靠性评审卡', subtitle: 'Rubric、veto、工具与拓扑', keywords: ['评审卡'], page: 'agent-book-review' },
  { id: 'review-sandbox', group: '评审与手册', title: '方案评审沙盘', subtitle: '形成可追溯的产品判断', keywords: ['review sandbox'], page: 'review' },
  { id: 'manual', group: '评审与手册', title: '公式与指标手册', subtitle: '关键公式、指标与决策口径', keywords: ['handbook'], page: 'handbook' },
]

const strategyCases: SearchDestination[] = strategyCaseCatalog.map((item) => ({
  id: `strategy-${item.id}`,
  group: '策略案例',
  title: item.title,
  subtitle: `${item.routeLabel} · ${item.question}`,
  keywords: [
    item.id, item.routeLabel, 'strategy-first', 'product decisions', 'trade-offs', 'feedback loops', '策略案例', '业务代价',
    ...(item.routeId === 'ai-decision-math' ? ['概率', '统计', '优化', '因果', '序贯决策', '数学练习'] : []),
    ...(flagshipCaseIds.has(item.id) ? ['精选案例', 'flagship'] : []),
  ],
  page: item.page,
  options: item.options,
}))

const routeLabels = new Map(strategyCaseCatalog.map((item) => [item.routeId, item.routeLabel]))
const videoEntries: SearchDestination[] = videoResources.map((video) => ({
  id: `video-${video.id}`,
  group: '参考视频库',
  title: video.title,
  subtitle: `${video.org} · ${video.speaker ? `${video.speaker} · ` : ''}${video.relatedRouteIds.map((routeId) => routeLabels.get(routeId) ?? routeId).join(' / ')} · ${video.contentOrigin}`,
  keywords: [video.title, video.speaker ?? '', video.org, video.contentOrigin, video.whyWorthWatching, video.language === 'zh' ? '中文' : '英文', video.level, ...video.relatedRouteIds],
  page: 'videos',
}))

export const searchIndex = [
  ...topLevel, ...strategyCases, ...videoEntries, ...routes, ...foundation, ...foundationLabs, ...bookChapters, ...bookLabs,
  ...distillCourses, ...distillLabs, ...agentCourses, ...agentLabs, ...reviewAndManual,
]
