## Context

### Design Read

这是一个已有 AI 学习产品中的完成证据纠偏，不是营销页重设计。保持现有 Strategy Case 信息架构和视觉语言，只修复状态、存储与验证契约。

项目是 React 18 + TypeScript 5.6 strict + Vite 6 的纯前端 SPA。Mission 当前有两条彼此独立的持久化链：

1. `genai-resource-loop-v1` 保存锁定预测、单快照和最近压力结果。
2. `genai-strategy-evidence-v2` 保存 controls、metrics、摘要级别及累计通过的 preset ID。

当前压力记录只有 `presetId / passed / metrics / ranAt`，无法证明这些指标由哪组基础 controls 产生。`StrategyCaseRunner.update()` 改变 controls 时不会使旧压力结果失效；`deriveMissionPhase()` 只检查“存在压力记录”和“存在 formedSummary”，因此旧通过结果仍可推进到复盘。`DecisionSummaryPanel` 的提交按钮也不检查预测与压力证据，点击即可保存 `level: 2`。能力矩阵再以 `level >= 2 && summaryText` 和独立的 `passedStressPresetIds` 推导覆盖，能够把不同时间、不同策略的行为拼成一次看似完整的成功。

确定性复现：

```text
旧基础策略 A 运行 preset P 并通过
             │
             ├─ 保存 lastStress(P, pass)，但不保存 A
             │
             ▼
用户修改为策略 B
             │
             ├─ lastStress 仍存在
             ├─ 点击“形成策略摘要”保存 B 的 level 2
             ▼
进度聚合得到：策略 B 已形成 + preset P 已通过
实际无法证明 P 曾验证 B
```

本次设计不涉及前后端 API。所有计算、持久化与验证都在浏览器本地完成。

### 约束

- 不新增依赖、路由、案例、顶层导航或后端。
- 保持 `genai-resource-loop-v1`、`genai-strategy-evidence-v2` 名称和旧记录可读。
- 未配置 mission 的 Strategy Case 行为完全不变。
- 压力测试失败也是有效学习证据，可以形成明确 No-Go 复盘；“执行过”不得冒充“通过”。
- 不删除旧压力记录来掩盖状态问题。UI 可展示它，但必须明确标为过期。
- 不把今天的切片扩大为新复盘表单、评分、徽章或课程内容。

## Goals / Non-Goals

**Goals:**

- 让 Mission 完成态只能由同一次尝试中的锁定预测、最终 controls、新鲜压力结果和显式摘要共同产生。
- 让压力结果可证明“测了哪组基础策略”和“preset 覆盖后实际算了什么”。
- 让 controls 改变后旧压力结果立即失去完成资格，同时保留其历史可见性。
- 让进度与能力矩阵只消费结构完整、来源一致的 Mission 完成证据。
- 保持旧数据可读、旧案例兼容和纯函数可测试性。
- 形成可复用 daily adversarial harness，后续每日换角色但使用同一证据门槛和闭环。

**Non-Goals:**

- 不要求压力测试必须通过才允许形成复盘。失败应支持 No-Go 或待调整结论。
- 不在本切片增加“判断变化原因”输入框、自动文本评分或语义相似度分析。
- 不重算或猜测旧压力记录对应的 controls，不把旧记录自动升级为新证据包。
- 不改变现有门槛数值、preset 内容、案例计算公式或摘要文案算法。
- 不归档 change，不提交代码；当前阶段只完成规范并等待批准。

## Decisions

### 1. 压力记录保存基础 controls 与有效 controls

扩展 `MissionStressRecord`：

```ts
type MissionStressRecord = {
  presetId: string
  passed: boolean
  baseControls: ControlValues
  effectiveControls: ControlValues
  metrics: MissionMetricSnapshot[]
  ranAt: string
}
```

- `baseControls` 是点击“运行测试”时用户界面的完整策略。
- `effectiveControls` 是应用 preset overrides 后传给 `compute()` 的完整输入。
- `metrics` 与 `passed` 仍是该有效输入的输出。
- `resourceLoop` 按既有 control ID 语法、原始值类型、长度和有限数规则清洗两个 controls 对象。

**为什么：** 保存完整的小型本地 controls 对象比只存时间戳或 preset ID 更可审计。现有每个案例 controls 数量很小，不构成显著存储负担。

**备选方案：** 只保存 JSON hash。体积更小，但无法在损坏数据排查和复盘中展示被测输入，且浏览器内还要定义稳定序列化与 hash 算法，不采用。

### 2. 使用 schema 驱动的规范化等值判断新鲜度

在 `missionEngine.ts` 增加纯函数：

```ts
type StressFreshness =
  | { fresh: true }
  | { fresh: false; reason: 'legacy-unbound' | 'controls-changed' | 'invalid-controls' }

compareStressToCurrent(
  schema: readonly ControlSchema[],
  current: ControlValues,
  stress?: MissionStressRecord,
): StressFreshness
```

比较仅遍历当前案例 `ControlSchema` 中声明的 ID，要求两侧均存在合法值并使用严格值相等。对象键顺序、时间戳和展示文本不参与判断。`effectiveControls` 另由测试证明等于 `{ ...baseControls, ...preset.overrides }`，不用于当前策略新鲜度比较。

**为什么：** 直接按 schema 比较能忽略未知脏键，也不会因 JSON 键顺序产生假过期。

**备选方案：** controls 改变时直接删除压力记录。实现更短，但用户看不到旧结果为何失效，也无法满足可审计性，不采用。

### 3. 一个纯完成门槛成为 UI、阶段和持久化的单一事实来源

在 `missionEngine.ts` 增加：

```ts
type MissionCompletionGate = {
  ready: boolean
  missing: Array<'prediction' | 'fresh-stress'>
  stressFreshness: StressFreshness
}

getMissionCompletionGate({
  prediction,
  schema,
  currentControls,
  stress,
}): MissionCompletionGate
```

状态流改为：

```text
未锁定预测 ───────────────────────────────> DRAFT
已锁定预测，无新鲜压力 ───────────────────> PREDICTION_LOCKED / EXPLORING
已锁定预测 + 当前 controls 的压力结果 ────> STRESS_PASS / STRESS_FAIL
上述条件 + 点击形成摘要 ─────────────────> DEBRIEF

任一 control 改变
  ├─ 历史压力仍展示为“已过期”
  ├─ 当前完成门槛失效
  └─ 已形成的临时复盘 UI 失效，回到 EXPLORING
```

`DecisionSummaryPanel` 新增可选的形成门槛 props。未传入时保持非 Mission 行为；Mission 分支传入 `ready` 和缺失项文案。按钮禁用只是可用性提示，`StrategyCaseRunner` 的保存回调还要再次检查纯门槛，防止只靠 UI 属性保护。

**为什么：** 双层保护避免未来组件调用方式绕过按钮禁用，也让阶段、按钮和存储共享一份判定。

**备选方案：** 在三个组件内分别写条件。容易出现 UI 显示未完成但存储已升级的漂移，不采用。

### 4. 完成时原子写入绑定证据包

扩展 `StrategyEvidenceRecord` 的可选字段：

```ts
type MissionCompletionEvidence = {
  attemptStartedAt: string
  formedAt: string
  prediction: string
  finalControls: Record<string, ControlValue>
  stress: {
    presetId: string
    passed: boolean
    baseControls: Record<string, ControlValue>
    ranAt: string
  }
}
```

Mission 形成摘要时，runner 重新读取当前 `ResourceLoopRecord`，再次调用完成门槛。只有 ready 时才用同一次调用写入：

- `level: 2` 与摘要；
- 最终 controls 与 metrics；
- `missionCompletion`；
- 若绑定压力通过，则在兼容字段 `passedStressPresetIds` 中合并该 preset；若失败则不增加通过集合。

`attemptStartedAt` 使用锁定预测的 `initialUpdatedAt`，无需新增随机 attempt ID。重开后新预测产生新时间，天然区分尝试。若缺少合法 `initialUpdatedAt`，门槛不允许新 Mission 完成。

`MissionStressPanel` 不再在“压力通过”时单独写跨尝试能力覆盖，只保存当前尝试压力结果。完整证据仅在形成摘要时原子写入。

**为什么：** 证据在完成事件上收口，避免“先通过 A，再提交 B”被 merge 拼接。

**备选方案：** 保留压力即时写入，再在 selector 中尝试关联时间。时间先后不能证明 controls 相同，不采用。

### 5. 旧记录可读但默认不获得新完成资格

- `resourceLoop` 继续读取缺少 `baseControls/effectiveControls` 的旧压力记录，标记为未绑定历史结果；不得猜测 controls。
- `strategyEvidence` 继续读取旧 `level`、摘要和 `passedStressPresetIds`，保证旧页面不崩溃、历史标签不丢失。
- 对带 mission 的能力矩阵，`strategyFormed` 与 `stressPassed` 改为只由合法 `missionCompletion` 推导。旧独立字段只用于历史展示，不满足新的绑定证据门槛。
- 对未带 mission 的案例，既有 `level` 和摘要解释完全不变。

**为什么：** 向后兼容不等于继续认可无法验证的旧证据。真实性优先于维持虚假的完成覆盖。

**备选方案：** 用现有 `strategyEvidence.controls` 反推旧压力基础策略。现有压力记录没有 base controls，无法证明反推成立，不采用。

### 6. 控件改变使当前形成态失效，但不篡改历史持久记录

`StrategyCaseRunner.update()` 在 Mission 分支中清除本地 `formedSummary`，并通过纯新鲜度判断让旧压力失去完成资格。它不删除 `resourceLoop.lastStress`，也不降低历史 `strategyEvidence.level`。新策略要形成新的当前复盘，必须重跑压力再点击形成摘要。

**为什么：** 已经发生的历史行为不能被悄悄删除，但当前 UI 也不能继续把它冒充为新策略证据。

### 7. 测试从源码存在性提升为行为关系

优先增加以下失败测试：

1. 压力记录 A 与当前 controls B 不同，完成门槛返回 `fresh-stress` 缺失。
2. 相同 schema 值但对象键顺序不同仍视为新鲜。
3. 旧压力记录缺少 controls 绑定时可读取但视为 `legacy-unbound`。
4. 未预测、未压力、压力后调参三条路径都不能保存新的 Mission `level: 2`。
5. 压力失败但与当前策略匹配时允许形成 No-Go 复盘，且不产生 `stressPassed`。
6. 完整通过证据包能产生 `strategyFormed + stressPassed`；旧摘要与旧 passed ID 不会被 selector 拼接。
7. 非 Mission `DecisionSummaryPanel` 与旧案例 level 行为不变。

保留必要静态契约测试，但不再用“源码中出现 `onFormed`”替代完成门槛行为测试。

### 8. 可复用 Daily Adversarial Harness 协议

协议作为本 change 的新 capability 与设计决策保存，后续归档后进入项目规范历史。

#### 8.1 角色轮换

固定循环：

| 顺序 | 角色 | 首要攻击面 |
|---|---|---|
| 1 | 算法怀疑者 | 因果链、指标口径、可证伪性、压力测试是否改变判断 |
| 2 | 学习迁移审计者 | 学习者能否从案例迁移到新场景，复盘是否只是复述 |
| 3 | 可靠性破坏者 | 边界输入、陈旧状态、并发/持久化失败、错误恢复 |
| 4 | 维护成本审计者 | 重复逻辑、隐式契约、测试脆弱性、依赖与 bundle 债务 |
| 5 | 可访问性反方 | 键盘、焦点、语义、动态播报、非颜色等价和窄屏 |

每日记录 `date / role / roleSource(user|rotation) / scope / evidenceLinks / selectedSlice / validation`。用户显式指定角色只覆盖当天，不推进或重排默认循环。

#### 8.2 证据要求

每个候选必须有六件套：

```text
代码位置 + 固定输入/步骤 + 实际结果
+ 被违反的规范/产品承诺 + 用户影响
+ 现有测试为什么没有拦住
```

证据优先级：可执行最小复现 > 行为测试 > 本地 UI 操作 > 线上 UI 观察 > 静态代码推断。静态推断不得单独进入修复清单。

#### 8.3 问题门槛

候选需全部通过：

- 可复现，不依赖“可能”“感觉”或未观测线上数据。
- 影响学习判断、证据可信度、核心可用性或维护安全边界。
- 能指出现有承诺与实际行为的冲突。
- 能在一天内完成修复、定向测试和必要回归。
- 优先修根因，不以增加页面、课程或装饰掩盖问题。

每天保留 1-3 个候选，只选一个实施切片。评分顺序是错误成功状态 > 误导决策 > 数据损坏 > 阻塞主路径 > 局部体验瑕疵。

#### 8.4 修复闭环

```text
角色质疑
  -> 收集可复现证据
  -> 1-3 个候选过门槛
  -> 选 1 个最小根因切片
  -> AimeSpec proposal/spec/design/tasks
  -> 用户批准
  -> 失败优先测试
  -> 最小实现
  -> 原复现转绿 + 相邻回归
  -> 手动关键路径
  -> 记录遗留假设
  -> archive
```

严格禁止用以下信号替代闭环：构建成功、测试数量增加、UI 能点击、用户访问了资源、模型或组件自报“成功”。

#### 8.5 今日实例

- 日期：2026-08-26。
- 角色：算法怀疑者，用户指定。
- 实证：旧压力通过可与新 controls 和新摘要合并，命令行最小复现得到 `phase=debrief` 且持久记录同时含新 controls 与旧通过 preset。
- 选中切片：绑定 Mission 完成证据到同一次尝试和最终策略。
- 延后问题：增加显式“判断如何变化及由何证据触发”的学习者输入，不在今日切片堆新功能。

## Concrete File Plan

### 预计修改

- `src/components/strategy/types.ts`：为压力记录和策略证据定义 controls 绑定结构。
- `src/components/strategy/missionEngine.ts`：新增 controls 规范化比较、压力新鲜度和统一完成门槛；收紧阶段推导。
- `src/components/strategy/StrategyCaseRunner.tsx`：以统一门槛编排摘要、阶段和复盘；controls 改变后失效当前形成态。
- `src/components/strategy/MissionStressPanel.tsx`：保存基础/有效 controls，停止提前写入未绑定的跨尝试通过证据，展示过期状态。
- `src/components/strategy/DecisionSummaryPanel.tsx`：增加可选形成门槛和缺失条件说明，非 Mission 调用保持兼容。
- `src/resourceLoop.ts`：向后兼容清洗新压力字段，旧未绑定记录可读但不可视为新鲜。
- `src/strategyEvidence.ts`：清洗、合并原子 `missionCompletion`，避免跨尝试拼接；保留旧字段读取。
- `src/components/strategy/missionCapabilities.ts`：Mission 能力覆盖只消费完整绑定证据。

### 预计测试

- `src/components/strategy/missionEngine.test.mjs`：新鲜度、旧记录、完成门槛、失败压力与阶段关系。
- `src/resourceLoop.test.mjs`：新压力字段清洗及旧记录降级。
- `src/strategyEvidence.test.mjs`：完成证据原子合并、旧字段不拼接、非 Mission 兼容。
- `src/components/strategy/missionCapabilities.test.mjs`：矩阵只消费绑定证据。
- `src/components/strategy/missionUi.test.mjs`：摘要门槛、过期提示和非 Mission 兼容的静态契约；若现有测试工具允许，优先补交互行为测试。

### 不涉及接口

无 HTTP API、请求方法或服务端返回值变化。浏览器本地存储是唯一持久化边界。

## Risks / Trade-offs

- [旧 Mission 完成覆盖会减少，用户可能认为进度回退] → 保留旧历史文案并解释“需用当前策略重跑后形成可验证证据”，不删除数据，不伪造绑定。
- [controls 严格比较可能因未来默认值补全产生假过期] → 只按当前 schema ID 比较，并先用 schema 默认值规范化缺省项；非法或未知值按不可验证处理。
- [形成摘要时跨两个 storage key 写入不具备真正事务] → 先验证完整上下文，再先写 resource attempt 所需状态、后写原子 completion；测试写失败时不得派发完成事件或更新 UI 完成态。
- [失败压力也允许完成可能被误读为成功] → 完成标签使用“已完整复盘”，压力能力仅在 `passed=true` 时覆盖，复盘文本明确 No-Go / 待调整。
- [组件 props 增加影响旧案例] → 新 props 全部可选，未传入时沿用当前 `DecisionSummaryPanel` 行为，并用无 mission 契约测试锁定。
- [范围超过轻量修改阈值] → 不修改依赖；实施时优先把判定集中到纯函数，若超过 5 个生产文件则按常规验证运行完整测试与构建门禁。

## Migration Plan

1. 在实施前保留本次 225/225 测试通过基线和命令行失败复现输出。
2. 先为新鲜度、完成门槛和旧数据降级加入失败测试。
3. 扩展类型与 `resourceLoop` 清洗，确保旧记录仍可读但返回 `legacy-unbound`。
4. 接入压力记录 controls 绑定与 runner 完成门槛；不得先改能力矩阵掩盖源头问题。
5. 在完成事件中写入原子 `missionCompletion`，再让能力 selector 只消费该结构。
6. 运行定向测试、全量 `pnpm test`、TypeScript/build、a11y、bundle 与 route chunk 门禁。
7. 手动验证两个 Mission 案例的四条路径：无预测、无压力、压力后调参、失败/通过压力后形成复盘。
8. 回滚时回退代码即可；新增字段可选，旧版本会忽略。禁止通过清空用户 localStorage 回滚。

## Open Questions

无阻塞问题。实施时需要在 UI 文案中统一使用“压力结果已过期，请按当前策略重跑”，并确认旧 Mission `level: 2` 在通用案例中心仍显示历史级别，但不进入新的 Mission 能力覆盖。这是兼容性与证据真实性的明确取舍。
