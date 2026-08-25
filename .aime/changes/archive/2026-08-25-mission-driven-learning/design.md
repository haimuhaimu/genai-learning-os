## Context

项目是 React 18 + TypeScript 5.6 strict + Vite 6 的纯前端 SPA，使用查询参数路由和路由级 lazy chunk。当前 `StrategyCaseSpec` 统一描述案例 controls、默认值、纯 `compute`、机制图和摘要，`StrategyCaseRunner` 已形成“预测—操控—证据—摘要—资源”的通用壳；`context-window-budget` 与 `rag-chunking` 已有确定性计算和轻量 HTML/CSS 机制图，适合作为首期完整示范。

预测与资源闭环目前写入 `genai-resource-loop-v1`，策略 controls/metrics/摘要写入 `genai-strategy-evidence-v2`。预测保存后仍可编辑；案例没有门槛、基线 delta、单快照、压力结果或能力证据聚合。进度页已经展示 `StrategyEvidenceSection`，因此能力矩阵可在既有 `progress` canonical page 内落地，不新增页面。

约束如下：

- 保持五个主导航、当前 33 个 canonical pages、所有旧 URL/深链、进度/证据/资源闭环键和值。
- `mission` 对所有 Strategy Case 是可选增强；首期只补全两个示范案例，不新增课程或案例。
- 不做积分、签到、排名、等级和儿童化徽章；成长只描述可追溯的证据覆盖。
- 所有压力计算在浏览器内调用既有纯函数，固定输入、无随机、无网络或真实服务。
- 不新增依赖，mission UI 不使用 Recharts；继续通过上一轮冻结的 bundle/chunk 门禁。
- 键盘、文本等价、克制 live region、移动端和 reduced-motion 是发布条件。

相关使用者包括学习者、键盘/辅助技术用户、案例作者和后续维护质量门禁的开发者。

## Goals / Non-Goals

**Goals:**

- 以可选 schema 将“角色—目标—门槛—压力—迁移—能力证据”加入通用 Strategy Case，而不制造第二套案例 runner。
- 让预测成为有承诺的“先下注”，并提供安全、明确、可撤销确认的重开任务路径。
- 用默认基线、当前策略和一个自定义快照建立轻量反事实比较。
- 用确定性 preset 验证策略在约束变化下是否仍满足门槛，并给出失败原因和返回旋钮。
- 在形成摘要后生成可复制复盘卡，并在进度页聚合 5 维证据覆盖。
- 以两个既有机制案例证明 schema、状态流、持久化、性能和可访问性均可复用。

**Non-Goals:**

- 不新增课程、案例、路由、顶层导航或分享后端。
- 不给能力总分、认证、排名、积分、签到或徽章。
- 不把压力测试包装成线上实验、真实模型评测或正式统计结论。
- 不把所有旧案例一次性补齐 mission 内容，也不更改未配置 mission 案例的视觉顺序和业务语义。
- 不新增状态库、图表库、测试框架或服务端存储。
- 不重命名或整体迁移 `genai-resource-loop-v1`、`genai-strategy-evidence-v2`。

## Decisions

### 1. Mission 是 `StrategyCaseSpec` 的可选声明式扩展

在 `src/components/strategy/types.ts` 增加如下概念，字段名以实现时最终类型为准，但语义保持固定：

```ts
type MissionCapability =
  | 'budget-allocation'
  | 'evidence-retrieval'
  | 'tradeoff-reasoning'
  | 'robustness-testing'
  | 'transfer-explanation'

type MissionGate = {
  id: string
  metricId: string
  operator: '>=' | '<='
  target: number
  label: string
  returnControlId: string
}

type MissionStressPreset = {
  id: string
  label: string
  description: string
  overrides: Partial<ControlValues>
}

type MissionSpec = {
  role: string
  objective: string
  gates: readonly [MissionGate, MissionGate, MissionGate?]
  stressPresets: readonly MissionStressPreset[]
  capabilities: readonly MissionCapability[]
  transferQuestion: string
}

type StrategyCaseSpec = ExistingFields & { mission?: MissionSpec }
```

门槛只引用 `compute()` 返回的 metric ID；preset 只覆盖现有 control，并与学习者当前 controls 合并后再次调用同一 `compute()`。`defineStrategyCase` 继续校验旧字段，并仅在 `mission` 存在时校验 2–3 个门槛、ID 唯一性、metric/control 引用、比较符、preset 值和能力词表。为了检查 metric ID，校验器用合法 defaults 调用一次 `compute`，并要求结果有限；不维护另一份指标清单。

**为什么：** 数据驱动后，通用 UI 不按 `caseId` 写分支；旧 spec 因字段可选而零迁移。

**备选方案：** 为两个示范各写专用组件。实现快但状态、可访问性和未来案例接入会复制，不采用。把 mission 放到统一内容 registry 也不采用，因为门槛与 `compute`/controls 强耦合，registry 只应保留发现元数据。

### 2. 门槛、delta 与压力测试集中为无 DOM 纯函数

新增 `src/components/strategy/missionEngine.ts`，包含：

- `evaluateMission(gates, evidence)`：输出逐门槛当前值、目标、通过状态、文本原因和总状态；缺失/非有限指标按失败且“无法计算”处理。
- `compareEvidence(reference, candidate, gates)`：以 metric ID 对齐，返回原值、现值、signed delta 和相对门槛方向的“改善/恶化/不变/无法比较”。不假设数值越大越好，而是根据 `operator` 判断方向。
- `runStressPreset(spec, currentControls, preset)`：先校验并合并 `{ ...currentControls, ...preset.overrides }`，再调用 `compute` 与 `evaluateMission`，生成固定结果及失败 control 建议。
- `buildDebriefText(...)`：把锁定预测、最终 controls、关键 delta、最近压力结果和迁移问题序列化为稳定、可复制纯文本。
- `deriveMissionPhase(...)`：只从锁定预测、快照/调参、压力结果、已形成策略等显式状态推导阶段。

所有函数不读取 DOM、时间、随机数、localStorage 或网络，便于 Node test runner 直接验证。

**为什么：** 页面显示、存储和能力矩阵可以共享同一判定，避免 UI 文案与测试逻辑漂移。

**备选方案：** 在 React 组件内用条件表达式现算。代码少但难以覆盖边界、复用和证明确定性，不采用。

### 3. 两个示范使用现有指标，preset 只施加确定性约束

`context-window-budget` 的 mission 建议配置：

- 角色：负责客服助手上下文预算的 AI 产品负责人。
- 目标：在受限窗口中保留全部固定任务并控制截断与单次综合代价。
- 门槛：`coverage >= 100`、`truncation <= 0`、`cost <= 0.20`；失败分别返回 `retrievalK/historyTurns`（schema 中每个门槛只存一个主 control，文案可补充关联 control）、`historyTurns`、`answerMode`。
- 压力 preset：`window=8000`，其余沿用当前策略。默认 16k 策略在该压力下得到 coverage 87.5%、truncation 11.894%、cost 约 0.344，能形成真实失败；例如减少历史并选择短答可通过，但 UI 不展示该组合。
- 能力标签：预算配置、取舍推理、压力验证、迁移解释。

`rag-chunking` 的 mission 建议配置：

- 角色：负责企业退款知识库检索质量的 RAG 产品负责人。
- 目标：覆盖全部必要证据，同时限制噪声和上下文预算。
- 门槛：`answerable >= 100`、`noise <= 75`、`contextTokens <= 2000`；失败返回 `chunkSize`、`overlap`、`contextCap`（各自对应一个主旋钮）。
- 压力 preset：`topK=10, contextCap=2000`，其余沿用当前策略。默认切块在压力下 noise 约 83.3% 而失败；不同 chunk/overlap 可以改善，但 UI 不预告通过组合。
- 能力标签：证据检索、取舍推理、压力验证、迁移解释。

数值用 raw metric 判定，不解析 display 字符串。`feedback` 与 caution 继续强调教学模拟边界。

**为什么：** 两个示范已有固定任务/文档及稳定公式，不需真实服务，也能让失败可修正。

**备选方案：** 新造压力数据集或调用模型。前者会扩大内容范围，后者破坏确定性、成本与隐私约束，均不采用。

### 4. Runner 使用显式任务状态，旧案例保持原树

`StrategyCaseRunner` 在拿到 `spec.mission` 后才创建 mission view model，并按以下状态流组合通用组件：

```text
                 保存预测
DRAFT --------------------------------> PREDICTION_LOCKED
  │                                           │
  │ 可探索但不形成完整证据                    │ 调参 / 保存一个快照
  │                                           ▼
  └--------------------------------------> EXPLORING
                                              │
                                              │ 运行确定性 preset
                                              ▼
                                      STRESS_PASS / STRESS_FAIL
                                              │         │
                                   形成摘要   │         └─ 回到建议旋钮
                                              ▼
                                           DEBRIEF

任意已锁定阶段 --“重开任务”+确认--> DRAFT
（只清当前预测与本轮比较；保留资源、旧复盘、已形成策略证据）
```

组件顺序为 `MissionBrief` → 预测 → controls/机制/证据 → `MissionComparisonPanel` → `MissionStressPanel` → 摘要 → `MissionDebriefCard` → 资源。MissionBrief 的状态随 controls 即时更新，但不展示 preset overrides 或推荐参数。未配置 mission 时保持当前 JSX 路径，不渲染空模块。

**为什么：** 任务状态可解释且由事实推导，无需全局状态机依赖；按 mission 分支可严格保护旧案例。

**备选方案：** 禁止未预测用户调整 controls。这样强化顺序但会阻止探索并造成旧行为回归，因此允许探索，只把完整证据与锁定预测关联。

### 5. 预测锁定和本轮比较扩展旧资源闭环，不更换 key

扩展 `ResourceLoopRecord`，新增可选、可清洗的 `missionAttempt`：

```ts
type MissionAttempt = {
  snapshot?: { controls: ControlValues; metrics: StoredMetric[]; savedAt: string }
  lastStress?: { presetId: string; passed: boolean; metrics: StoredMetric[]; ranAt: string }
}
```

`saveInitialJudgment` 改为幂等锁定：已有非空预测时返回原记录，不覆盖文本和时间。新增 `reopenMissionAttempt(caseId)`，只清空 `initialJudgment`、`initialUpdatedAt` 和 `missionAttempt`，保留 `reviewJudgment`、资源触达、更新时间语义及其他案例。写入失败继续使用现有 session fallback。`StrategyPredictionPanel` 将已保存预测渲染为只读文本，重开使用原生 button + 二次确认；取消后焦点回触发器。

自定义快照和“最近压力结果”属于当前尝试，放入同一旧记录便于原子重开；再次保存直接替换，因此每案例最多一个快照。旧 `schemaVersion: 1` 和 `genai-resource-loop-v1` 均不改变，解析器把缺失 `missionAttempt` 当空状态。

**为什么：** 不增加相互失配的 storage key，且能精确实现“重开只清预测/对比”。

**备选方案：** 调用现有 `clearResourceLoop`。它会连资源和复盘判断一起删除，超出重开语义，不采用。另建 `genai-mission-*` key 会让原子清理与导入兼容更复杂，也不采用。

### 6. 通过压力测试作为向后兼容的持久证据

`StrategyEvidenceRecord` 在 `genai-strategy-evidence-v2` 内新增可选字段：

```ts
type MissionEvidence = {
  passedStressPresetIds: string[]
  lastStressAt?: string
}
```

压力测试通过后，以当前案例既有 level（至少为 1）保存 preset ID；merge 对通过 ID 取去重并集，不因后续调参或重开当前尝试而倒退。失败结果不作为能力覆盖，但保留在 `missionAttempt.lastStress` 供当前复盘显示。形成摘要继续由原按钮写 level 2 与最终 controls/metrics；复盘卡以当次当前态生成，不新增永久“分享件”。

**为什么：** 能力矩阵需要跨刷新读取真实可见行为；持久通过证据与“当前尝试结果”职责不同。沿用 v2 可保持证据聚合入口和事件机制。

**备选方案：** 仅根据当前 metrics 是否达标推导压力能力。用户没有点击压力测试也会被算作通过，违反可见行为原则，不采用。

### 7. 能力矩阵是证据 selector，不是评分系统

新增 `missionCapabilities.ts` 作为受控词表、标签文案和纯 selector。`deriveCapabilityEvidence(strategyRecords, missionSpecs)` 只读取：

1. `level >= 2 && summaryText`：形成策略证据；
2. `missionEvidence.passedStressPresetIds`：压力通过证据。

输出固定 5 维矩阵，每维列出来源案例、已有证据类型与下一项待补证据。`CapabilityEvidenceMatrix.tsx` 在 `ProgressPage` 的 `StrategyEvidenceSection` 后展示，标题和说明明确“证据覆盖，不等于能力认证”，不计算百分比、总分、等级或排名；来源案例为可键盘激活的现有深链。

**为什么：** 复用现有进度页和策略 evidence 数据，既可解释又不制造虚荣指标。

**备选方案：** 放在首页。首页是高频入口且有严格轻量依赖目标；进度页已有策略证据依赖，放在这里对入口和认知负担更小。

### 8. 复盘卡由已形成策略事件解锁，复制只使用浏览器能力

`DecisionSummaryPanel` 增加 `onFormed` 回调或返回形成状态给 runner。mission 案例形成摘要后，`MissionDebriefCard` 使用纯 `buildDebriefText` 聚合：

- 锁定预测（缺失时明确“未记录”）；
- 最终 controls 与摘要；
- 默认基线到最终策略的 2–3 个门槛指标 delta；
- 最近压力测试及逐项原因（缺失时“未执行”）；
- spec 的迁移问题。

复制优先 `navigator.clipboard.writeText`，失败时聚焦并全选只读 textarea，与现有摘要复制保持一致。不发送请求、不生成公开 URL。

**为什么：** 复盘必须基于用户明确提交的策略，而不是每次 slider 变化自动制造完成感。

**备选方案：** 每次调参实时生成复盘。会混淆临时探索与可复用策略，不采用。

### 9. 可访问性采用原生语义和“提交时播报”

- 所有动作使用 button、label、fieldset/legend、列表和表格/定义列表等原生语义；无 `div onClick`。
- MissionBrief 当前状态、delta 与压力结果均同时提供“通过/未通过”“+/- 数值”“改善/恶化”文本或图标，不依赖颜色。
- range/choice 的即时变化不写入 live region；仅预测保存/重开、快照保存/替换、压力完成、摘要形成和复制结果用短 `role=status` 或 `aria-live=polite`。
- 压力失败的“返回旋钮”通过 control DOM id 聚焦，按钮名称包含目标 control label，不泄漏目标取值。
- 重开确认取消后焦点回触发器；确认后焦点移到预测标题或输入。
- CSS 使用现有断点改单列，长 delta 和表头可换行；`prefers-reduced-motion` 下取消新增过渡和自动平滑滚动。

**备选方案：** 用动画仪表盘表达状态。它增加体积且让颜色/运动承载信息，不采用。

### 10. 性能门禁沿用冻结字节并约束依赖图

上一轮 `check-bundle.mjs` 的冻结上限为：JS 1,413,471 B、CSS 321,108 B、总量 1,734,579 B、最大 chunk 404,116 B、入口 JS 291,412 B、首屏 CSS 201,705 B。当前构建观测约为总量 1,728,368 B、入口 JS 122,488 B、首屏 CSS 22,047 B、最大 chunk 342,098 B；这些观测只用于容量预警，不替代冻结门禁。

新组件只能由 `StrategyCaseRunner` 或 `ProgressPage` 的现有 lazy 边界导入。能力 selector 不进入应用壳；任务 UI 不导入 Recharts。实现应通过共享格式化/复制逻辑、删除重复 JSX/CSS 和最小数据字段抵消总 bundle 增量；不得通过提高预算通过 CI。`check-route-chunks.mjs` 增加 mission 模块不得进入入口、Recharts 仍隔离的断言。

**备选方案：** 为 delta 引入图表库。会使案例路由依赖 Recharts 并扩大总量，不采用。

## Concrete File Plan

### 新增文件

- `src/components/strategy/missionEngine.ts`：门槛评估、delta、压力执行、阶段推导、复盘文本纯函数。
- `src/components/strategy/missionEngine.test.mjs`：门槛边界、指标缺失、方向语义、确定性 preset、阶段与复盘测试。
- `src/components/strategy/missionCapabilities.ts`：5 维能力词表和证据覆盖 selector。
- `src/components/strategy/missionCapabilities.test.mjs`：空态、仅摘要、摘要+压力、来源去重和非评分断言。
- `src/components/strategy/MissionBrief.tsx`：角色、目标、门槛、预算与总状态。
- `src/components/strategy/MissionComparisonPanel.tsx`：默认基线/当前/单快照 A/B 与文本 delta。
- `src/components/strategy/MissionStressPanel.tsx`：preset 触发、逐项结果、失败旋钮定位与克制播报。
- `src/components/strategy/MissionDebriefCard.tsx`：完成后聚合与纯文本复制降级。
- `src/components/foundation/CapabilityEvidenceMatrix.tsx`：进度页 5 维证据矩阵。

### 修改文件

- `src/components/strategy/types.ts`：新增 mission、门槛、preset、能力、快照/压力结果类型；`mission` 保持可选。
- `src/components/strategy/defineStrategyCase.ts`：增加 mission 结构、引用和值域校验；不改变旧 spec 必填项。
- `src/components/strategy/defineStrategyCase.test.mjs`：覆盖合法 mission、2–3 门槛、坏 metric/control、非法 preset/能力和无 mission fallback。
- `src/components/strategy/mechanismCases.ts`：仅给 `context-window-budget`、`rag-chunking` 增加完整 mission 元数据，复用原计算函数与固定数据。
- `src/components/strategy/mechanismCases.test.mjs`：冻结两案例门槛、压力 preset 输出与重复执行一致性。
- `src/components/strategy/StrategyCaseRunner.tsx`：编排 mission 状态、基线/当前计算、快照、压力、形成摘要与复盘；无 mission 走旧路径。
- `src/components/strategy/StrategyPredictionPanel.tsx`：已保存预测只读、重开二次确认、焦点恢复和状态通知。
- `src/components/strategy/StrategyControlsPanel.tsx`：为 control 提供稳定 DOM id/ref 定位契约，不改变现有输入行为。
- `src/components/strategy/DecisionSummaryPanel.tsx`：暴露明确的形成事件并复用复制状态文案，不自动形成证据。
- `src/components/strategy/strategyCases.css`：任务简报、比较、压力与复盘的轻量响应式样式及 reduced-motion。
- `src/resourceLoop.ts`：同一 v1 key 内兼容清洗/保存 `missionAttempt`，锁定首次判断，新增只清预测与本轮比较的重开函数。
- `src/resourceLoop.test.mjs`：预测不可覆盖、确认后的底层重开语义、单快照替换、坏新增字段降级、写失败 session fallback 和旧夹具兼容。
- `src/strategyEvidence.ts`：同一 v2 key 内兼容保存/合并通过的压力 preset 证据，保持 level 单调。
- `src/strategyEvidence.test.mjs`：压力证据去重并集、失败不计覆盖、旧记录读取和事件兼容。
- `src/components/foundation/ProgressPage.tsx`：挂载能力证据矩阵，不新增 route。
- `src/styles/progress.css`：能力矩阵桌面/移动布局、文本状态和 reduced-motion 样式。
- `src/pageRegistry.tsx`：仅在 `progress` lazy loader 中加载 `styles/progress.css`；33 个 page 不变。
- `src/compatibility.fixture.ts`、`src/compatibility.test.mjs`：固定 33 pages、五导航、旧 storage key/旧记录和两个既有 case 深链。
- `scripts/check-a11y-static.mjs`：若现有规则不足，增加 mission 交互的 button/label/live-region 静态契约。
- `scripts/check-route-chunks.mjs`：断言 mission 组件不进入入口或无关聚合页，且不依赖 Recharts。
- `scripts/check-bundle.mjs`：保留现有冻结字节，仅补充报告/断言可读性；不得提高任何常量。

## Risks / Trade-offs

- [当前总 bundle 距冻结总量上限仅约 6.1 KiB，新 UI 容易超限] → 先运行并记录门禁，优先共享格式化/复制逻辑、精简图标导入和删除重复代码/CSS；若仍超限则缩减 UI 而不是提高预算。
- [在 `defineStrategyCase` 中调用 `compute(defaults)` 可能让未来副作用计算暴露问题] → 文档化 `compute` 必须纯且确定，测试所有案例重复调用一致；mission 校验只在模块定义阶段运行一次。
- [门槛方向并不等同于单指标业务价值] → delta 文案同时展示目标与整体门槛，不把单项“改善”表述成方案整体更优。
- [preset 覆盖 control 可能让用户误以为策略被永久修改] → 压力面板明确列出“仅本次测试的约束”，不写回当前 controls；结果注明测试输入。
- [重开后历史通过证据仍在能力矩阵中可能造成困惑] → 文案标记为“历史可见行为证据”和来源案例；重开只重置当前尝试，不伪装撤销既有完成行为。
- [v1/v2 记录扩展遇到损坏或恶意 localStorage] → 延续长度、数量、危险 key、合法 ID、有限数和日期清洗；坏新增字段不牵连旧字段。
- [无 mission fallback 因 runner 重构而发生视觉回归] → 使用明确分支与旧案例夹具，测试未配置 mission 时组件、计算、摘要与存储路径不变。
- [live region 在高频调参时造成噪声] → 即时值只视觉更新，只有提交型事件播报短句。
- [能力标签过度解释学习者水平] → 固定使用“证据覆盖/待补证据”，不展示分数、百分比、认证或人格判断。

## Migration Plan

1. **冻结基线**：在未实现状态运行 `pnpm ci:check` 和 bundle/chunk 脚本，记录现有 33 pages、五导航、两个 storage key 旧夹具及精确产物；不修改预算。
2. **先建纯契约**：扩展类型与 `defineStrategyCase` 校验，新增 missionEngine/能力 selector 及失败优先测试，确认所有无 mission 旧 spec 仍通过。
3. **补两个示范 spec**：为 context-window-budget 与 rag-chunking 加 mission，冻结默认/压力输出并证明重复运行一致。
4. **扩展持久化**：在旧 v1/v2 key 内增加可选字段、清洗和 merge；实现预测幂等锁定、单快照替换、当前任务重开和历史压力通过证据，先用内存 storage 测试。
5. **接入案例 UI**：按 MissionBrief、比较、压力、复盘顺序接入 runner；逐步验证无 mission 分支和 Clipboard 降级。
6. **接入进度页**：加入能力矩阵和 `progress.css` lazy import，验证只从已形成策略/通过压力的记录推导。
7. **兼容与可访问性**：回归五导航、33 pages、旧深链、旧记录；完成键盘、焦点、live region、文本等价、移动端及 reduced-motion 检查。
8. **性能与全量门禁**：运行 `pnpm ci:check`，确认入口 JS/CSS、总 bundle、最大 chunk及现有 JS/CSS 子门禁均未超过冻结值，Recharts 不进入 mission 路径且无新依赖。
9. **手动视觉**：使用 `html_vision` 检查案例中心、两个 mission 深链、进度页及移动端/减少动态效果，并保存检查记录。
10. **回滚**：回滚实现提交即可；由于旧 schema 字段可选且 key 未变，旧版本会忽略新增字段。不得通过清空用户 localStorage 回滚。

## Open Questions

无阻塞问题。实现时必须以当前 `compute` raw 数值而非格式化字符串判门槛；示范门槛和 preset 在编码前应由产品/内容评审确认一次，但不得改成暴露推荐参数的“标准答案”。
