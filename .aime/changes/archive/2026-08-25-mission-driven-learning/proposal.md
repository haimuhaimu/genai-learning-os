## Why

当前 Strategy Case 已具备“预测—调参—证据—摘要”的骨架，但缺少明确任务情境、可计算成功门槛、基线对照与确定性压力验证，学习者容易把调参当作浏览指标，难以感知选择的即时后果和可迁移成长。IA、内容 registry 与路由性能重构刚完成，现在适合在不新增课程、不扩张导航和依赖的前提下，把趣味集中到有约束的策略决策循环，而不是积分、签到或儿童化徽章。

## 技术栈识别与现状

- React 18 + TypeScript 5.6（strict）+ Vite 6 的纯前端 SPA；路由由 URL 查询参数、`src/routeConfig.ts` 与 `src/pageRegistry.tsx` 管理。
- 样式为原生 CSS/Tailwind 构建链；图标使用 `lucide-react`；现有 Recharts 仅用于独立懒加载图表，本变更不加载或扩展它。
- 测试使用 Node test runner + `tsx`，质量入口为 `pnpm ci:check`，包含 lint、测试、静态可访问性、构建及 bundle/chunk 门禁。
- 学习状态保存在浏览器 localStorage；既有关键键包括 `genai-resource-loop-v1` 与 `genai-strategy-evidence-v2`，本变更保持键名与旧数据读取语义。

## 目录结构摘要

```text
src/
├── components/strategy/       # Strategy Case schema、runner、预测、控件、证据与摘要
│   ├── types.ts
│   ├── defineStrategyCase.ts
│   ├── StrategyCaseRunner.tsx
│   └── mechanismCases.ts       # context-window-budget / rag-chunking
├── components/foundation/
│   └── ProgressPage.tsx        # 进度页与能力证据矩阵入口
├── resourceLoop.ts             # 首次判断与资源闭环，本机存储 v1
├── strategyEvidence.ts         # 策略证据，本机存储 v2
├── routeConfig.ts              # 33 个 canonical pages 与旧深链契约
└── styles/                     # 壳、首页、进度等按路由拆分样式
scripts/
├── check-bundle.mjs            # 冻结 raw bundle 预算
└── check-route-chunks.mjs      # 路由 chunk / Recharts 隔离门禁
```

## What Changes

- 为 `StrategyCaseSpec` 增加完全可选的 `mission` 元数据：角色、一句话目标、2–3 个可计算门槛、确定性压力测试预设、能力标签；未配置 `mission` 的旧案例保持原渲染、计算和存储行为。
- 为所有带 mission 的 Strategy Case 提供通用任务模式：顶部 MissionBrief/Status 只显示任务、预算/目标与当前达标状态，不透露推荐配置或正确答案。
- 首次预测保存后锁定；学习者只能通过有确认步骤的“重开任务”清除当前案例的预测及本轮对比状态，且不更名、不迁移既有 storage key。
- 增加“影子策略”比较：默认基线与当前策略始终可比较，并允许仅保存一个自定义快照做 A/B；使用轻量 HTML/CSS 和带方向、数值及含义的文本 delta。
- 增加由 spec 确定性 preset 驱动的压力测试；不随机、不调用真实服务，展示通过/失败、逐项原因和应返回调整的旋钮。
- 在形成策略摘要后生成可复制复盘卡，聚合锁定预测、最终策略、关键 delta、压力测试结果与迁移问题；不新增分享后端。
- 在首页或现有进度页展示 4–6 维轻量能力证据矩阵，只从“已形成策略”和“通过压力测试”的可见行为推导覆盖情况，不给总分、不声称能力认证。
- 为 `context-window-budget` 与 `rag-chunking` 配置完整 mission、门槛、基线、压力 preset 和能力标签，作为首期端到端示范；不新增课程或案例。
- 补齐 schema/fallback、纯函数、预测锁定与重开、快照、复盘、能力矩阵、存储兼容、键盘与 reduced-motion 测试；执行完整 `ci:check`、bundle/chunk 门禁和指定页面的 `html_vision` 手动视觉验证。

## 新学习循环

```text
任务情境（角色 + 目标 + 有限预算）
                 │
                 ▼
          先下注并锁定预测
                 │
                 ▼
     调整策略 ──→ 即时因果反馈
        ▲              │
        │              ▼
  回到指定旋钮 ← 确定性压力测试
        │              │
        └──── 未通过 ──┘
                       │通过
                       ▼
       基线 / 当前 / 自定义快照反事实比较
                       │
                       ▼
        形成策略摘要 → 可复制复盘卡
                       │
                       ▼
       能力“证据覆盖”（不是认证或分数）
```

## Capabilities

### New Capabilities

- `mission-driven-strategy-cases`: 定义可选 mission schema、任务简报与状态、锁定预测、影子策略/单快照对比、确定性压力测试、复盘卡、能力证据矩阵及其可访问性与降级行为。

### Modified Capabilities

- `resource-learning-loop`: 将已保存的首次判断改为任务内锁定，并定义经确认重开当前案例时仅清除预测和任务对比状态、保持旧存储键及其他案例/资源闭环数据兼容的行为。
- `stable-information-architecture`: 明确本变更不得增加顶层入口或页面，继续保持五个主导航、当前 33 个 canonical pages、旧 URL/深链及现有进度/证据/资源闭环入口。
- `route-performance-budget`: 在上一轮已冻结的精确基线上增加“不得回归”的变更级门禁；mission UI 不引入新依赖、不加载 Recharts，并保持入口与路由 chunk 拆分。

## Impact

- **主要影响范围**：`src/components/strategy/` 的 schema、校验器、runner 与展示组件，`resourceLoop.ts`、`strategyEvidence.ts`，以及 `ProgressPage.tsx`/进度样式中的能力证据矩阵。
- **内容影响**：仅为 `context-window-budget` 和 `rag-chunking` 补齐 mission 元数据；其余 Strategy Case 通过可选字段继续工作，不新增或改写课程。
- **持久化影响**：沿用现有 storage key；允许在现有记录中向后兼容地增加可选任务字段，解析失败或 localStorage 不可用时回退到当前会话且不阻断案例。
- **性能与依赖**：不增加 npm 依赖、不使用 Recharts；入口 JS、首屏 CSS、总 JS、总 CSS、总 bundle 与最大 chunk 均不得超过上一轮冻结门禁。
- **可访问性**：全部操作键盘可达、焦点可见；状态变化使用克制的 `aria-live`；通过/失败和 delta 同时提供文字/符号，不以颜色为唯一信息；动效尊重 `prefers-reduced-motion`。
- **无破坏性变更**：不修改五入口 IA、33 个 canonical pages、旧 URL、旧 ID、旧进度/证据/资源闭环，不调用真实服务，不新增后端。
