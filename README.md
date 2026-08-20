# GenAI Learning OS

**通过产品决策学习 AI，而不是从公式开始。**

[在线体验](https://haimuhaimu.github.io/genai-learning-os/) · [从策略案例开始](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-cases) · [查看贡献指南](CONTRIBUTING.md) · [English README](README_EN.md)

**8 条学习路线 · 8 个策略案例 · 31 条精选资源**，包含中文内容、Karpathy 学习材料，以及仍处于早期的自进化与世界模型探索。

多数教程解释模型如何运行；本项目让你先做产品策略决策，再回到算法机制，理解指标、代价和反馈闭环。

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

## 八条学习路线

| 路线 | 决策焦点 | 代表案例或实验 |
| --- | --- | --- |
| 算法基础 | 上线策略如何改变训练反馈 | 反馈闭环 / Softmax & CE |
| LLM 系统 | 召回质量、延迟与预算 | RAG 预算权衡 |
| 图像生成 | 可用率、重试与单位成本 | 单张可用图成本 |
| Agent 系统 | 工具副作用与确认门 | 退款工具确认门 |
| Agent Book | 拓扑是否带来新信息 | 多 Agent 新信息判据 |
| 模型蒸馏 | 一致率与关键能力保留 | 蒸馏能力保留 |
| 自进化（前沿探索） | evaluator 是否可信、何时停手 | [Evaluator Trust](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=evaluator-trust) |
| 世界模型（前沿探索） | 仿真、LLM 推演与真实反馈如何取舍 | [Simulator vs Reality](https://haimuhaimu.github.io/genai-learning-os/?page=strategy-case&case=simulator-vs-reality) |

> 自进化与世界模型仍在早期。本项目把它们作为有边界的探索路线，不把研究方向描述为成熟生产方案。

## 为谁而做

- **AI 产品**：练习把模型能力翻译成策略变量、指标与上线边界。
- **策略 / 运营**：看清流量、预算、人工与反馈数据之间的联动。
- **工程 / 研究**：把机制指标放回产品约束，检验方案是否值得做。
- **正在转型者**：用可操作案例建立 AI 决策语言，而不是从公式背诵开始。

## 学习资源

- [参考视频库](https://haimuhaimu.github.io/genai-learning-os/?page=videos)：共 31 条精选资源，覆盖 8 条路线，可按语言、难度与内容来源筛选；包含中文内容、Karpathy 从零构建材料，以及自进化与世界模型的重点论文和博客。
- 只收录能对应“决策、证据、代价或反馈闭环”的资源；每条都说明为什么值得看，以及看完要回到哪个决策问题。
- 视频不嵌入、不自动播放，点击或观看不计入学习进度。维护与推荐方式见 [参考视频贡献指南](docs/VIDEO_CONTRIBUTING.md)。

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

项目是纯前端应用：无需登录或后端，不调用模型 API；学习进度只保存在当前浏览器的 `localStorage`。GitHub Pages 部署由 [deploy-pages 工作流](.github/workflows/deploy-pages.yml) 完成，`homepage` 与 canonical URL 均指向正式 Pages 地址。

## 验证

```bash
pnpm run lint
pnpm run build
pnpm run check:videos
pnpm run typecheck:case-example
node --test
git diff --check
```

所有公式、估算、图表与实验结果均为机制级教学模拟，不代表商业模型的真实实现或实测性能。生产决策应使用目标模型、真实数据、日志、压测、安全审查与组织规范验证。

## 项目结构

```text
.
├── docs/CASE_AUTHORING.md          # Strategy Case 作者协议
├── docs/VIDEO_CONTRIBUTING.md      # 参考视频筛选与维护指南
├── examples/strategy-case/         # 可类型检查、未注册的最小示例
├── src/resources/videoCatalog.ts   # 结构化参考视频 Catalog
├── src/components/strategy/        # Case SDK、catalog、runner 与案例
├── src/components/foundation/      # 算法基础与统一学习地图
├── src/searchIndex.ts              # 站内搜索索引
└── .github/ISSUE_TEMPLATE/         # Bug、内容与 Case 提案模板
```

## 路线图

路线图只描述方向，不承诺日期，见 [ROADMAP.md](ROADMAP.md)。

## License

本项目采用 [Apache License 2.0](LICENSE)。第三方内容归属与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## Acknowledgements

- **Agent Book** 模块参考并改编自李博杰的开源项目 [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)，具体来源声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 视觉改版方法参考 [taste-skill](https://github.com/haimuhaimu/taste-skill)；本项目未直接复制其代码或文本。

[English README](README_EN.md) · [贡献指南](CONTRIBUTING.md) · [行为准则](CODE_OF_CONDUCT.md) · [安全政策](SECURITY.md)
