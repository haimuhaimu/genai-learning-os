# Roadmap

本路线图只说明维护方向，**不承诺具体发布时间**。

## 已落地：AI 决策数学

第 9 条路线“AI 决策数学”已落地，包含概率校准、贝叶斯更新、向量相似度、优化稳定性、熵与 KL、A/B 与因果、奖励与序贯决策、误差传播 8 个短 Case。后续维护重点是校准固定数据、补充教学关系测试，并保持数学判断与真实策略动作相连。

## 已落地：学习者共建入口

学习者共建中心已将参与方式拆为 1 分钟反馈、30 分钟内容贡献与深度 Strategy Case 三条路径，并接入 Issue Forms、`good first issue` 搜索、署名说明与公开边界。后续根据真实贡献反馈持续降低首次参与成本，不以贡献数量代替内容质量。

## 阶段一：完善旗舰案例

持续校准 `rag-budget`、`refund-gate` 与 `new-information` 的固定数据、指标口径、业务代价与反馈解释；补齐桌面、窄屏、可访问性和教学关系测试。

## 阶段二：开放 Case 贡献

稳定 `defineStrategyCase`、最小示例、作者指南、Issue 表单和 catalog 注册流程；优先接收决策问题清楚、数据可复现、代价可解释的社区案例。

## 阶段三：证据式评审与双语

让策略摘要、证据级别与评审意见更容易复核和分享；逐步补齐核心案例与贡献文档的中英文体验。

## 前沿探索路线

新增 `self-evolving` 与 `world-model` 两条前沿路线。它们主要用于跟踪 evaluator 可信度与内部模拟器的可行边界。前沿路线不承担主线学习任务，也不引入新的 UI 概念；两条路线各含 1 个策略 case，以真实业务场景切入，任何自动闭环上线前请先设计人工兜底与停手条件。

## 维护者发布前 checklist

- [ ] Repo description 建议：`Strategy-first AI learning through product decisions, trade-offs, and feedback loops — not formula memorization.`
- [ ] Topics 建议：`ai-education`, `interactive-learning`, `algorithm-visualization`, `product-strategy`, `llm`, `ai-agents`, `typescript`, `react`
- [ ] Social preview 建议使用 [`docs/assets/strategy-case-center.png`](docs/assets/strategy-case-center.png)
- [ ] 确认 README、Pages 深链与截图对应当前发布版本

以上仅为 GitHub 列表页准备项；维护者确认发布前不修改远端 metadata。
