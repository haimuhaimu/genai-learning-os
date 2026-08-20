# Strategy Case 作者指南

Strategy Case 是从**业务目标与产品决策**出发的可复现学习单元。它不只是参数 Playground：学习者要改变策略、看固定证据、承担业务代价、识别反馈可见性，并形成下一轮训练动作与可保存摘要。

> English summary: A Strategy Case is a deterministic, typed learning unit that starts with a product decision and ends with a reviewable strategy summary. Copy the example, keep computation pure, register one catalog entry, and test the learning claim.

## 七段协议

1. **业务目标**：说明需要改善的用户或业务结果。
2. **策略动作**：提供少量、真实、可解释的控制变量。
3. **固定证据**：使用本地固定数据，保证不同学习者能复现。
4. **代价账本**：同时展示质量、成本、延迟、人工或风险。
5. **反馈可见性**：说明策略会记录什么，以及哪些失败不会进入反馈。
6. **下一轮训练**：把可见失败转成采样、标注、训练或系统治理动作。
7. **策略摘要**：将选择、指标、边界与下一步组织成可评审文本。

## 目录结构

```text
src/components/strategy/
├── defineStrategyCase.ts       # 类型约束与开发期运行时校验
├── types.ts                    # StrategyCaseSpec 与输出类型
├── caseCatalog.ts              # 案例元数据、路由、CaseId 与证据白名单的单一事实来源
├── <yourCase>.ts               # 固定数据、纯函数与 spec
└── <yourCase>.test.mjs         # 默认值、边界、确定性与教学关系测试
examples/strategy-case/         # 不进入产品 registry 的最小示例
```

## 最小 Spec 字段

真实类型定义见 [`src/components/strategy/types.ts`](../src/components/strategy/types.ts)，校验器见 [`defineStrategyCase.ts`](../src/components/strategy/defineStrategyCase.ts)。

| 字段 | 约束与用途 |
| --- | --- |
| `id` | 小写 kebab-case；加入 catalog 后自动进入 `CaseId` 与证据白名单 |
| `routeId` | `ai-decision-math`、`llm`、`image`、`agent`、`agent-book`、`distill`、`self-evolving` 或 `world-model` |
| `routeLabel` | 页面展示的路线名 |
| `title` / `question` | 案例标题与单一决策问题 |
| `duration` | 可读的预计耗时 |
| `background` | 决策背景与业务约束 |
| `feedback` | 明确反馈来源、可见性或遮蔽边界 |
| `controls` | `range`、`select`、`choice`、`toggle` 控件数组；ID 不得重复 |
| `defaults` | 每个 control 必须有默认值；范围、步长、选项与布尔类型会在开发期校验 |
| `fixedDataTitle` / `fixedDataRows` | 页面展示的固定教学数据说明 |
| `compute` | 从 controls 到 `DecisionEvidence` 的纯函数 |
| `summarize` | 从 controls 与 evidence 到 `DecisionSummary` 的纯函数 |

`visibility` 属于 catalog 元数据，不是 `StrategyCaseSpec` 字段。省略或设为 `center` 时会进入案例中心；`hub-only` 仍进入全局 registry、搜索与证据白名单，但不会在案例中心主栅格平铺。

`DecisionEvidence` 必须返回 `metrics`、`costs`、`feedbackSource`、`feedbackSignals` 与 `nextTrainingAction`；可选 `caution`。不要增加 runner 不认识的伪字段。

## `compute()` 与 `summarize()` 契约

- `compute(controls)` **必须是纯函数**：不读写 DOM、网络、时间、存储或全局可变状态；相同输入得到深度相同输出。
- 所有 metric 的 `value` 必须是有限非负数；`display` 自带单位，不能把不同口径伪装成同一准确率。
- `summarize(controls, evidence)` 只组织已有选择与证据，不重新计算隐藏结果；返回 `{ text, nextAction }`。
- 摘要需包含策略选择、至少一个关键指标、边界或代价、下一轮动作。

## 质量约束

### 确定性

固定数据保存在 case 文件内；禁止新增非确定性随机数、实时请求或依赖当前时间的计算。默认值与边界组合都要有测试。

### 教学准确性

区分离线固定数据、教学估算与生产实测；为核心权衡写关系测试，例如“提高召回覆盖会增加 token，但不保证证据精度”。说明指标口径、单位、假设与不能推出的结论。

### 可访问性

控件必须有文本 label；不能只用颜色表达结果；结果更新沿用 runner 的 `aria-live`；键盘可操作；在桌面和 320px 宽度下无页面级横向溢出。

## 从模板到可搜索案例

- [ ] 复制 [`examples/strategy-case/exampleCase.ts`](../examples/strategy-case/exampleCase.ts)，改名并移入 `src/components/strategy/`。
- [ ] 使用 `defineStrategyCase(...)`；完成七段字段、固定数据、`compute()` 与 `summarize()`。
- [ ] 在 `src/components/strategy/caseCatalog.ts` 导入 spec，并向 `strategyCaseCatalog` 增加一个 `fromSpec(...)`；默认 `visibility: 'center'`，只应在专用 Hub 出现的子 Case 使用 `visibility: 'hub-only'`。
- [ ] **不要**手改 `CaseId`：它由 catalog 推导；route mapping 与 `strategyEvidence.ts` 的证据白名单也来自 catalog。
- [ ] 搜索入口由 `src/searchIndex.ts` 从 catalog 生成；用案例 ID、标题和路线名实际搜索一次。
- [ ] 新增 Node 单测：合法默认值、边界、确定性、有限非负输出和核心教学关系。
- [ ] 运行 `pnpm run typecheck:case-example`、`pnpm run lint`、`pnpm run build`、`node --test`。

Foundation 的 `foundation-feedback-loop` 仍跳转既有实验；它是 catalog 中唯一不使用通用 runner 的兼容项。

## 最小示例（不超过 120 行）

完整可复制代码见 [`examples/strategy-case/exampleCase.ts`](../examples/strategy-case/exampleCase.ts)。该目录不会进入产品 registry；`pnpm run typecheck:case-example` 使用独立 `tsconfig.json` 验证它与真实 SDK 类型保持一致。

## PR 自检清单

- [ ] 决策问题只有一个主语义，控制变量能被业务角色解释。
- [ ] 固定数据可公开、可复现，不含账号、凭据、私有日志或内部域名。
- [ ] 默认值合法；无重复 control ID；所有输出有限且带口径。
- [ ] `compute()` / `summarize()` 确定、纯函数化；无非确定性随机数。
- [ ] 测试证明核心教学关系，而不只断言快照。
- [ ] catalog、站内搜索与深链刷新可用，证据可保存。
- [ ] 桌面与 320px 布局、键盘与可访问名称已检查。
- [ ] PR 说明业务目标、策略变量、代价、反馈闭环、教学边界与验证命令。
