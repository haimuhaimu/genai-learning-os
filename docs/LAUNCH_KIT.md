# GenAI Learning OS 发布与宣传工具包

> 供 GitHub Release、仓库 About 与外部传播直接取用。所有数量均以 v1.0.0 当前仓库内容为准。

## 1. GitHub Release

### 标题建议

`v1.0.0 — Strategy-first AI Learning`

### Release Notes（可直接粘贴）

GenAI Learning OS v1.0.0 以 **Strategy-first AI Learning** 为核心：通过产品决策学习 AI，而不是从公式开始。

## Highlights

- 8 条学习路线：6 条主线路线，以及自进化、世界模型 2 条前沿探索路线。
- 8 个策略案例：从业务目标出发，经过策略动作、固定证据、代价账本、反馈可见性与下一轮训练，最终形成可保存的策略摘要。
- 31 条精选资源：包含中文内容、Karpathy 学习材料，以及面向前沿探索的论文与博客。
- 策略证据进度：用“做过什么决策、依据什么证据、下一步如何验证”表达学习进度，而不只记录章节完成度。
- Case authoring 支持：提供作者协议、可类型检查的最小示例、测试要求与贡献流程。
- 纯前端、无需登录：可直接通过 GitHub Pages 体验，学习进度保存在当前浏览器。

## Why it matters

普通算法课程往往先给出公式和知识点，再寻找应用场景。GenAI Learning OS 反过来：先让学习者面对 RAG 预算、工具副作用、Agent 拓扑或 evaluator 可信度等产品决策，再回到算法机制理解指标、代价和反馈闭环。目标不是给出脱离场景的“标准答案”，而是帮助学习者留下可评审、可继续验证的策略证据。

自进化与世界模型仍处于早期。本项目将其作为有明确边界、人工兜底与停手条件的探索路线，不把研究方向包装成成熟生产方案。

## Try it

- [打开 GenAI Learning OS](https://haimuhaimu.github.io/genai-learning-os/)
- [从策略案例中心开始](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-cases)
- [查看 31 条精选资源](https://haimuhaimu.github.io/genai-learning-os/?page=videos)
- [体验自进化 Evaluator Trust Case](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=evaluator-trust)
- [体验世界模型 Simulator vs Reality Case](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=simulator-vs-reality)

## Contribute

欢迎贡献新的策略 Case、中文优质资源，以及对现有案例固定证据和决策边界的验证反馈。开始前请阅读 [贡献指南](../CONTRIBUTING.md) 与 [Strategy Case 作者指南](CASE_AUTHORING.md)。

## 2. GitHub 仓库 About

### Description（英文，≤160 字符）

`Strategy-first AI learning through product decisions, fixed evidence, cost ledgers, and feedback loops. 8 tracks, 8 cases, 31 curated resources.`

### 推荐 Topics（12 个以内）

`generative-ai` · `ai-education` · `strategy-first` · `product-strategy` · `interactive-learning` · `llm` · `ai-agents` · `rag` · `model-distillation` · `self-evolving-ai` · `world-models` · `react`

## 3. 社交平台宣传文案

### 中文短版（适合即刻 / 朋友圈 / 工作群）

发布 GenAI Learning OS v1.0.0：通过产品决策学习 AI，而不是从公式开始。现有 8 条路线、8 个策略案例、31 条精选资源，覆盖中文、Karpathy、自进化与世界模型。欢迎体验，也欢迎贡献策略 Case、中文资源和验证反馈：https://haimuhaimu.github.io/genai-learning-os/

### 中文长版（适合公众号 / 知乎 / 掘金开篇）

学 AI 时，我们很容易沿着“概念—公式—模型结构—更多概念”一路积累，却很难回答真正落到产品上的问题：RAG 多召回一点是否值得额外延迟和上下文成本？Agent 自动退款要不要加确认门？蒸馏后的平均一致率够高，是否就能上线？如果让 AI 自己评分并迭代，什么场景必须停手？

GenAI Learning OS 想尝试另一种顺序：通过产品决策学习 AI，而不是从公式开始。每个 Strategy Case 都先给出业务目标和可控动作，再用固定证据呈现质量、成本、延迟或风险，最后要求学习者说明反馈从哪里来、哪些信息被策略遮蔽，以及下一轮应该补什么数据或系统能力。学习进度因此不只是“看完一章”，而是一份可以保存、复述和继续验证的策略证据。

v1.0.0 当前包含 8 条学习路线、8 个策略案例和 31 条精选资源。资源覆盖中文内容、Karpathy 学习材料，也加入了自进化与世界模型两个前沿探索方向。后两者仍在早期，项目会明确人工兜底、停手条件和证据边界，不把研究方向包装成成熟方案。

它是一个无需登录、无需模型 API 的纯前端开源项目。你可以先用 5 分钟完成一个案例，再按卡点回到资源库补机制。也欢迎贡献新的策略 Case、中文优质资源，或用真实经验指出案例里的证据缺口和决策边界。

在线体验：https://haimuhaimu.github.io/genai-learning-os/

### English short launch post（80–150 words）

I’m releasing GenAI Learning OS v1.0.0, a strategy-first way to learn AI through product decisions, not formulas first. Instead of treating progress as chapters completed, each Strategy Case asks you to choose an action, inspect fixed evidence, account for quality, cost, latency, or risk, and define the next feedback or training step. The current release includes 8 learning tracks, 8 Strategy Cases, and 31 curated resources, with Chinese-language material, Karpathy resources, and early explorations of self-evolving AI and world models. The frontier tracks are presented with explicit limits and stop conditions, not as mature production recipes. It is open source, frontend-only, and requires no sign-in or model API. Try it, contribute a Strategy Case, or help validate the evidence and decision boundaries: https://haimuhaimu.github.io/genai-learning-os/

## 4. 传播标题候选

1. **先做决策，再学算法：GenAI Learning OS v1.0.0**
2. **把 AI 学习进度写成一份策略证据**
3. **从 RAG 预算到世界模型：8 条 Strategy-first 学习路线**

## 5. 首次访问者 5 分钟体验路线

1. [进入策略案例中心](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-cases)：用 30 秒浏览 8 个 Case，选一个与你当前工作最接近的决策问题。
2. [完成 Evaluator Trust Case](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=evaluator-trust)：调整一次策略，查看固定证据与代价，并生成策略摘要；该案例属于仍在早期的前沿探索。
3. [打开精选资源库](https://haimuhaimu.github.io/genai-learning-os/?page=videos)：按刚才暴露的机制卡点筛选资源，而不是从头刷完整课程。

## 6. 贡献者召集

我们优先寻找三类贡献：

- **策略 Case**：提供一个真实、可复述的产品决策问题，并把业务目标、可控动作、固定证据、代价账本、反馈可见性和下一轮训练动作写完整。
- **中文资源**：推荐能直接补足某个 Case 机制卡点的中文课程、视频、论文解读或实践文章，并说明“为什么值得看”和“看完回到哪个决策问题”。
- **案例验证反馈**：基于实际经验检查固定证据、指标定义、代价假设、风险边界和停手条件；欢迎指出不成立或需要补证的部分，而不只评价页面表现。

参与方式：阅读 [贡献指南](../CONTRIBUTING.md)；若要编写 Case，再按照 [Strategy Case 作者指南](CASE_AUTHORING.md) 与 [`examples/strategy-case`](../examples/strategy-case/) 最小示例开始。
