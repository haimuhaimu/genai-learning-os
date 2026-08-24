## Context

现有站点已经拥有 Strategy Case、视频/论文 Catalog、多类前端实验和两套 localStorage 学习记录，但资源点击、用户首次判断与复盘判断彼此割裂。论文库也只有阅读入口，没有把论文机制转成可操作实验的统一页面。

本次变更横跨资源、案例、路由、状态和实验模块，因此需要明确共享契约，避免把五个实验分别做成互不一致的孤岛。

## Goals / Non-Goals

**Goals:**

- 在 Strategy Case 内建立可被学习者感知、可本地持久化的资源学习闭环。
- 用统一页面和注册表承载五篇论文的确定性微型实验。
- 让论文讲解、交互实验和 Strategy Case 相互跳转。
- 保持现有静态部署、隐私、无障碍和测试约束。

**Non-Goals:**

- 不运行真实模型，不下载模型权重，不提供训练服务。
- 不验证用户是否完整看完视频或论文。
- 不上传自由文本、学习轨迹或 localStorage 内容。
- 不在首版实现逐字文本 diff、账号同步或排行榜。

## Decisions

### 1. 学习闭环采用独立 localStorage schema

新增 `genai-resource-loop-v1`，按 caseId 保存首次判断、复盘判断、去重后的资源触达和更新时间。它不复用 `strategyEvidence.summaryText`，因为用户自由回答与系统生成策略摘要语义不同。

备选方案是扩展 strategyEvidence，但会让既有导入导出和阶段语义变复杂，因此不采用。

### 2. 闭环嵌入 Strategy Case，而不是新建独立页面

学习者做决策、查看相关资源和复盘都发生在同一案例上下文，嵌入可以减少跳转并自然复用 caseId。视频与论文外链打开时记录 touched resource，回到原页即可继续。

### 3. 论文实验采用注册表和统一实验契约

```text
PaperResourceCard
      │ paperId
      ▼
?page=paper-lab&paper=<id>
      │
      ▼
PaperLabsPage ── PaperLabRegistry
      │
      ├── Transformer attentionCompute
      ├── Wide & Deep wideDeepCompute
      ├── DDPM ddpmCompute
      ├── ReAct reactCompute
      └── DreamerV3 dreamerCompute
```

每个实验拆成纯函数计算模块与 UI 组件。统一页面负责论文上下文、切换、学习结论和返回入口；各实验只负责状态与可视化。

备选方案是把实验直接塞入 PaperLibrary，但会放大首屏体积、破坏筛选体验，也不利于深链分享，因此不采用。

### 4. 首版使用教学型确定性模型

Transformer 使用小矩阵计算；Wide & Deep 使用固定样本与固定参数；DDPM 使用固定种子；ReAct 使用确定性策略表；DreamerV3 使用固定小型环境。结果旨在复现机制与取舍，不宣称复现论文完整训练结果。

### 5. 论文与实验映射由显式注册表维护

只有注册表中存在的 paperId 才显示“交互复现”。这比标题关键词匹配稳定，也能被静态测试校验，避免论文 ID 变更后产生死链。

### 6. API 与依赖

本方案不新增或调用任何后端 API，也不新增 npm 依赖。所有计算与存储均在浏览器本地完成。

## 文件变更范围

### 新建

- `src/resourceLoop.ts`：闭环 schema、清洗、读写、更新与事件。
- `src/resourceLoop.test.mjs`：持久化与状态转换测试。
- `src/components/strategy/ResourceLearningLoop.tsx`：首次回答、复盘与前后对比。
- `src/components/strategy/StrategyPaperPanel.tsx`：案例内论文入口。
- `src/components/paperLabs/PaperLabsPage.tsx`：论文实验统一页面。
- `src/components/paperLabs/paperLabsRegistry.ts`：论文与实验映射。
- `src/components/paperLabs/shared/math.ts`、`seeded.ts`：确定性计算工具。
- `src/components/paperLabs/transformer/*`：注意力实验与测试。
- `src/components/paperLabs/recsys/*`：Wide & Deep 实验与测试。
- `src/components/paperLabs/diffusion/*`：DDPM 实验与测试。
- `src/components/paperLabs/agent/*`：ReAct 实验与测试。
- `src/components/paperLabs/worldModel/*`：DreamerV3 实验与测试。
- `src/paperLabs.css`、`src/resourceLearningLoop.css`：响应式样式。

### 修改

- `src/components/strategy/StrategyCaseRunner.tsx`：挂载学习闭环和论文面板。
- `src/components/resources/VideoResourceCard.tsx`、`PaperResourceCard.tsx`：资源触达回调和实验入口。
- `src/components/resources/PaperLibrary.tsx`：传递论文实验导航。
- `src/resources/paperCatalog.ts`：暴露论文关联查询。
- `src/routeConfig.ts`、`src/business.tsx`：新增 paper-lab 深链。
- `src/searchIndex.ts`、`src/health/route-index.test.mjs`：搜索与路由校验。
- `README.md`、`README_EN.md`、`CHANGELOG.md`：功能说明。

## Risks / Trade-offs

- [五个实验导致首版变更较大] → 使用 lazy import 和注册表拆分，实验计算保持纯函数。
- [用户把资源点击误解为完成学习] → UI 始终使用“已打开/已触达”，不使用“已学完”。
- [自由文本属于个人学习数据] → 仅本地存储、显式隐私提示、支持按案例清除。
- [教学模型被误解为论文精确复现] → 页面标注“机制复现”，说明固定样本和简化假设。
- [localStorage 损坏或禁用] → 所有读取经过清洗，写入失败时降级到当前会话状态。

## Migration Plan

新增 schema 与路由，不修改已有存储结构，因此无需数据迁移。发布失败时可整体回滚该提交；旧页面和旧 localStorage 数据仍可正常使用。

## Open Questions

无阻塞问题。首版默认同时交付资源闭环与五个机制实验；后续再根据使用反馈决定是否加入逐字 diff、跨设备同步和更多论文。
