# GenAI Learning OS

**通过产品决策学习 AI，而不是从公式开始。**

[在线体验](https://haimuhaimu.github.io/genai-learning-os/) · [从策略案例开始](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-cases) · [参与学习者共建](https://haimuhaimu.github.io/genai-learning-os/?page=co-build) · [查看贡献指南](CONTRIBUTING.md) · [English README](README_EN.md)

**9 条学习路线 · 9 个代表策略案例 + 8 个 AI 决策数学练习 · 7 门 Case Academy 黄金课 · 43 条精选视频/课程 + 23 篇核心论文讲解**，包含中文课程、Karpathy 学习材料，以及从推荐系统、LLM 到 Agent 与世界模型的阅读路径。

多数教程解释模型如何运行；本项目让你先做产品策略决策，再回到算法机制，理解指标、代价和反馈闭环。

## 学习反馈中心

桌面端 Header 与移动端菜单均提供“反馈”入口。反馈中心收集收获程度、难度 / 深度、工作迁移价值、最大卡点与建议，可生成预填 GitHub Issue 或复制 Markdown。页面上下文默认不附带；主动勾选后也只包含 `routeConfig` 定义的 `page/module/experiment/node/section/chapter/card/case/paper` 白名单路由，不读取或发送本地进度、策略摘要、资源闭环回答、浏览器 UA 或其他 `localStorage` 数据。达到“已评审”或保存策略摘要后只会出现一次低干扰提醒，不会自动打开弹窗。

## 学习者共建中心

[`?page=co-build`](https://haimuhaimu.github.io/genai-learning-os/?page=co-build) 将贡献拆成 1 分钟反馈、30 分钟内容贡献和深度 Strategy Case 三条路径。每条路径都提供可直接使用的站内反馈、Issue Form、`good first issue` 搜索或作者指南；首次贡献者可按“选问题 → 对齐约定 → 最小改动与验证 → 可评审 PR”四步开始。贡献者可在 PR 中设置公开显示名和可选个人主页；Roadmap 不承诺日期，公开 Issue / PR 不应包含真实账号数据、私有日志、凭据、内部域名或未公开漏洞。

![GenAI Learning OS 策略案例中心桌面截图，展示 Strategy-first 定位、统一学习协议、路线筛选、精选案例标签，以及算法基础、RAG、图像生成和退款工具案例卡片](docs/assets/strategy-case-center.png)

## 三个旗舰案例

### RAG 预算权衡 · `rag-budget`

**决策问题：** 多召回一点是否值得增加噪声、上下文成本与延迟？你最终会产出一份包含 `k`、重排阈值、回答模式、关键指标和下一轮采样动作的 RAG 上线策略摘要。[进入案例](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=rag-budget)

### 退款工具确认门 · `refund-gate`

**决策问题：** 自动退款的速度是否值得承担工具副作用风险？你最终会产出一份确认门、风险阈值、业务成本、trace 要求和下一轮数据动作清晰的工具治理策略。[进入案例](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=refund-gate)

### 多 Agent 新信息判据 · `new-information`

**决策问题：** 增加角色是在获得新 observation，还是重复相同判断？你最终会产出一份拓扑选择、验证器、成功与重复指标、单位成本和 Harness 改进动作完整的协作策略。[进入案例](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=new-information)

## 它和普通算法课程有什么不同

| 维度 | 普通算法课程 | GenAI Learning OS |
| --- | --- | --- |
| 学习顺序 | 先公式，再找应用 | 先做产品决策，再回到机制 |
| 进度判断 | 章节完成度 | 可复述、可保存的策略证据 |
| 知识组织 | 知识点逐项堆叠 | 固定证据、代价账本与反馈闭环 |

## 统一学习协议

每个 Strategy Case 都遵循同一条七段链路：

1. **业务目标**：先说明要改善什么；
2. **策略动作**：让用户选择真实可控变量；
3. **固定证据**：使用可复现的教学数据；
4. **代价账本**：同时呈现质量、成本、延迟或风险；
5. **反馈可见性**：说明策略会留下什么、遮蔽什么；
6. **下一轮训练**：把失败切片转成数据或系统动作；
7. **策略摘要**：形成可评审、可继续迭代的结论。

## 资源学习闭环与论文机制实验

每个统一 Strategy Case 都提供“首次判断 → 主动打开关联视频或论文 → 复盘判断 → 前后并排对比”的闭环。资源触达只在用户点击打开时记录，**不代表看完或掌握**。首次与复盘回答、触达时间均按 case 隔离保存在当前浏览器的 `genai-resource-loop-v1` 中；可单独清除当前 case，`localStorage` 不可用时会降级为当前会话状态，且不会推进既有学习进度。

[Case Academy：通过 Case 学 AI](https://haimuhaimu.github.io/genai-learning-os/?page=paper-lab) 把全部七门黄金课组织为可发现、可续学、可复习的主线，覆盖 Transformer、模型蒸馏、Wide & Deep、DDPM、ReAct、DreamerV3 与 Switch Transformers。每课按“先猜 → 看 AI 犯错 → 只改一个人话变量 → 自己总结 → 最后揭示术语与公式”推进；本机安全保存关卡和通关状态。Switch Transformers 新课使用固定 12 条退款、政策、代码与检索请求，展示分流强度过低导致爆仓、适中达到 Go、高到过度均衡又损害质量的非单调取舍。所有实验均为无需后端的确定性教学简化，不等于完整训练复现或生产模型性能。

## 数学零层：先把公式翻译成人话

[数学符号与基础概念扫盲](https://haimuhaimu.github.io/genai-learning-os/?page=math-primer) **不是数学课，是把 AI 公式翻译成人话**。页面用 26 张基础概念卡解释常见符号、运算与概念，并提供 10 道符号翻译小测，帮助不熟悉数学的学习者先建立阅读公式所需的最低基础。数学零层、AI 决策数学与学习路线入口现已增加直接可见的中文术语翻译和缩写人话解释，移动端无需悬停即可阅读。

完成扫盲后，可继续进入 [AI 决策数学路线](https://haimuhaimu.github.io/genai-learning-os/?page=decision-math)，在 8 个 3–5 分钟练习中把这些概念用于校准、贝叶斯、相似度、优化、分布、因果、序贯奖励与误差传播等真实策略判断。

## 九条学习路线

| 路线 | 决策焦点 | 代表案例或实验 |
| --- | --- | --- |
| 算法基础 | 上线策略如何改变训练反馈 | 反馈闭环 / Softmax & CE |
| AI 决策数学 | 数字是否足以支持策略行动 | [8 个 3–5 分钟数学练习](https://haimuhaimu.github.io/genai-learning-os/?page=decision-math) |
| LLM 系统 | 召回质量、延迟与预算 | RAG 预算权衡 |
| 图像生成 | 可用率、重试与单位成本 | 单张可用图成本 |
| Agent 系统 | 工具副作用与确认门 | 退款工具确认门 |
| Agent Book | 拓扑是否带来新信息 | 多 Agent 新信息判据 |
| 模型蒸馏 | 一致率与关键能力保留 | 蒸馏能力保留 |
| 自进化（前沿探索） | evaluator 是否可信、何时停手 | [Evaluator Trust](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=evaluator-trust) |
| 世界模型（前沿探索） | 仿真、LLM 推演与真实反馈如何取舍 | [Simulator vs Reality](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=simulator-vs-reality) |

课程深度练习已完成三轮扩展：14 个 LLM / 图像章节加入先修检查、算一遍与迁移模板；Self-Evolving / World Model 案例加入可计算证据、停手条件与采样动作；13 个 Expert / Agent / Distill 模块加入 Decision Brief（决策简报）练习。

> 自进化与世界模型仍在早期。本项目把它们作为有边界的探索路线，不把研究方向描述为成熟生产方案。

## 为谁而做

- **AI 产品**：练习把模型能力翻译成策略变量、指标与上线边界。
- **策略 / 运营**：看清流量、预算、人工与反馈数据之间的联动。
- **工程 / 研究**：把机制指标放回产品约束，检验方案是否值得做。
- **正在转型者**：用可操作案例建立 AI 决策语言，而不是从公式背诵开始。

## 学习资源

- [参考视频库](https://haimuhaimu.github.io/genai-learning-os/?page=videos)：43 条精选视频与课程，可按路线、语言、难度与内容来源筛选；新增 3Blue1Brown、StatQuest、D2L、李宏毅、OpenBMB、Hugging Face、MIT、Stanford、CMU、DeepLearning.AI 与 Google 官方入口。
- [核心论文讲解库](https://haimuhaimu.github.io/genai-learning-os/?page=papers)：23 篇核心论文覆盖推荐系统、Transformer / LLM、扩散 / 多模态、Agent / Harness 与自我改进 / 世界模型；每篇按“30 秒看懂 / 关键机制 / 产品视角 / 带回课程的问题”组织。
- 资源不嵌入、不自动播放，点击或阅读不计入学习进度。维护方式见 [参考视频贡献指南](docs/VIDEO_CONTRIBUTING.md) 与 [论文讲解库贡献指南](docs/PAPER_CONTRIBUTING.md)。

## 贡献一个 Case

1. 复制 [`examples/strategy-case`](examples/strategy-case/) 的最小示例，按七段协议替换业务问题与固定数据。
2. 使用 `defineStrategyCase(...)` 完成 spec、纯函数 `compute()` / `summarize()` 和测试，再把 case 加入 catalog。
3. 按 [Strategy Case 作者指南](docs/CASE_AUTHORING.md) 自检，并阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 后提交 Pull Request。

## 本地运行

要求 Node.js 20+、pnpm 10+。

```bash
git clone https://github.com/haimuhaimu/genai-learning-os.git
cd genai-learning-os
pnpm install
pnpm dev
```

项目是纯前端应用：无需登录或后端，不调用模型 API；学习进度只保存在当前浏览器的 `localStorage`。学习反馈仅在用户主动打开 GitHub Issue 或复制 Markdown 时离开页面，且默认不附带页面上下文。GitHub Pages 部署由 [deploy-pages 工作流](.github/workflows/deploy-pages.yml) 完成，`homepage` 与 canonical URL 均指向正式 Pages 地址。

## 验证

```bash
pnpm run lint
pnpm run build
pnpm run check:videos
pnpm run typecheck:case-example
node --test
git diff --check
```

### 自动化回归

```bash
pnpm ci:check
pnpm test
pnpm check:a11y
pnpm check:bundle
```

CI 会在 Pull Request 与 Pages 部署前执行自动化回归；当前全量测试共 153 项，并拦截无障碍与产物体积回退。

所有公式、估算、图表与实验结果均为机制级教学模拟，不代表商业模型的真实实现或实测性能。生产决策应使用目标模型、真实数据、日志、压测、安全审查与组织规范验证。

## 项目结构

```text
.
├── docs/CASE_AUTHORING.md          # Strategy Case 作者协议
├── docs/VIDEO_CONTRIBUTING.md      # 参考视频筛选与维护指南
├── docs/PAPER_CONTRIBUTING.md      # 论文讲解卡贡献指南
├── examples/strategy-case/         # 可类型检查、未注册的最小示例
├── src/components/hubs/CoBuildHub.tsx # 学习者共建中心
├── src/resources/videoCatalog.ts   # 结构化参考视频 Catalog
├── src/resources/paperCatalog.ts   # 核心论文讲解 Catalog
├── src/components/strategy/        # Case SDK、catalog、runner 与案例
├── src/components/foundation/      # 算法基础与统一学习地图
├── src/searchIndex.ts              # 站内搜索索引
└── .github/ISSUE_TEMPLATE/         # Bug、内容、Case 与工程维护表单
```

## 路线图

路线图只描述方向，不承诺日期，见 [ROADMAP.md](ROADMAP.md)。

## License

本项目采用 [Apache License 2.0](LICENSE)。第三方内容归属与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## Acknowledgements

- **Agent Book** 模块参考并改编自李博杰的开源项目 [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)，具体来源声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 视觉改版方法参考 [taste-skill](https://github.com/haimuhaimu/taste-skill)；本项目未直接复制其代码或文本。

[English README](README_EN.md) · [贡献指南](CONTRIBUTING.md) · [行为准则](CODE_OF_CONDUCT.md) · [安全政策](SECURITY.md)
