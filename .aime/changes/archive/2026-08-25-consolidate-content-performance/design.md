## Context

站点是 React 18 + TypeScript + Vite 6 的纯前端单页应用，`src/business.tsx` 使用 URL 查询参数与 History API 管理路由。`src/routeConfig.ts` 当前声明 34 个 canonical page、`map` 别名和 8 类深链参数；`ProductHeader.tsx` 暴露约 10 个顶层入口。内容则分散在 `*Data.ts`、`learningPath.ts`、`components/strategy/`、`components/paperLabs/` 与 `resources/` 等多套清单中。

JS 页面组件大多已使用 `lazy`，但首页 `UnifiedMap` 仍被应用壳静态导入，`business.tsx` 还静态导入课程数据和 17 个业务 CSS 文件。当前构建 raw 指标为 JS 1380.3 KiB、CSS 313.6 KiB、合计 1693.9 KiB、最大 chunk 394.6 KiB；产物中入口 JS 约 355.7 KiB，入口 CSS 约 303.0 KiB，Recharts/AreaChart chunk 约 394.6 KiB。CSS 已达到现有检查预算上限。

本设计同时影响导航、路由、内容数据、聚合页、构建分块和质量门禁。使用者包括学习者、键盘/辅助技术用户和后续内容维护者。实施必须保留所有旧 URL、深链参数、内容 ID 与进度 ID，并不得修改、撤销或重写当前分支已有的两个机制沙盒提交。

## Goals / Non-Goals

**Goals:**

- 把顶层 IA 固定为首页、学堂、案例、实验室、工具箱五个入口，并为所有页面建立明确的导航分区归属。
- 保留 34 个既有 canonical page、旧别名、深链参数和进度数据；只新增工具箱聚合页，不删除旧页面。
- 建立类型安全、可分片、可校验的内容 registry，统一内容元数据和关系，同时让旧正文 schema 继续工作。
- 由 registry 驱动学堂、实验室、工具箱三个聚合页，并提供可访问筛选、空状态与错误兜底。
- 让所有页面实现和业务页面 CSS 脱离应用入口，保持 Recharts 独立，并避免首页静态依赖大型正文数据。
- 把首屏 CSS、入口 JS、总 bundle、最大 chunk 与异步产物形态变成可执行门禁。

**Non-Goals:**

- 不新增课程、实验、案例、视频或论文内容，不删除或改写现有正文。
- 不改品牌名称、视觉品牌方向或核心学习方法。
- 不引入 CMS 后端、数据库、第三方路由、新状态库或新的运行时依赖。
- 不在本轮统一全部课程和实验正文组件，也不把所有旧数据文件改造成同一 schema。
- 不改变现有学习进度、案例闭环或论文实验的业务语义。

## Decisions

### 1. 五入口 IA 使用导航配置与兼容归属表，不用 URL 重写

新增 `src/navigation.ts`，声明五个 `PrimarySection` 及 `page -> section` 的穷尽映射：

```text
home     -> unified-map；progress
academy  -> routes；所有课程页；reviews/review/evaluation
cases    -> strategy-cases；strategy-case
labs     -> labs；所有 *-lab 与 paper-lab
toolbox  -> toolbox；videos；papers；handbook；co-build
```

`ProductHeader` 只渲染五个入口，入口目标保持 `unified-map`、`routes`、`strategy-cases`、`labs`、`toolbox`。旧页面仍按原 canonical page 渲染，仅通过 `primarySectionForPage(page)` 决定导航高亮。`progress` 继续作为头部工具快捷入口，不计入五个顶层入口。

选择这一方案是因为它把“用户看到的 IA”和“兼容 URL”解耦，可在不破坏收藏、分享链接或埋点语义的前提下收口导航。

**备选方案：**

- 把 `videos`、`papers` 等旧 URL 301/前端重定向到聚合页：会丢失用户直达语义和可能的筛选上下文，不采用。
- 重命名 `routes` 为 `academy`：会破坏旧链接；新 IA 标签使用“学堂”，URL 保持 `routes`。
- 删除不再显示的顶层页面：违反兼容和不删除内容约束，不采用。

### 2. `UnifiedMap` 与 `LearningRoutesHub` 采用互补职责

- `UnifiedMap`：跨内容类型总览、角色推荐、继续学习和少量轻量摘要；不得承载完整目录，也不得静态导入完整内容集合。
- `LearningRoutesHub`：学堂聚合页；从 registry 查询课程/路线，展示层级、标签、学习顺序及关联实验/案例。
- `StrategyCaseCenter`：案例的统一发现入口。
- `LabsHub`：所有实验的统一发现入口，不再维护手写 `groups` 平行数组。
- 新增 `ResourcesHub`：同页聚合视频与论文，支持全部/视频/论文及标签筛选；旧 `VideoLibrary`、`PaperLibrary` 仍可直达。

**备选方案：**在首页嵌入所有路线、实验和资源目录。这样会继续放大首页依赖和认知负担，也与性能目标冲突，因此不采用。

### 3. Registry 采用“轻量核心 + 类型分片 + 现有正文适配”

新增以下结构：

```text
src/content/
├── types.ts                 # ContentType、Status、RouteTarget、ContentEntry
├── vocabulary.ts            # 受控标签、层级、状态
├── registry/
│   ├── courses.ts           # 课程/路线最小元数据
│   ├── cases.ts             # 对 caseCatalog 的元数据投影
│   ├── labs.ts              # 各实验体系与 paper labs 的入口元数据
│   ├── resources.ts         # 对 videoCatalog/paperCatalog 的元数据投影
│   └── index.ts             # 合并清单与只读索引；仅由需要的页面加载
├── selectors.ts             # 可见性、类型、标签、层级、关联筛选
└── validateRegistry.ts      # 无 DOM 的纯函数校验器
```

核心类型建议为判别联合：

```ts
type ContentType = 'course' | 'case' | 'lab' | 'video' | 'paper'
type ContentStatus = 'published' | 'draft' | 'archived'
type RouteTarget = { page: Page; options?: Partial<Record<RouteKey, string>> }
type ContentEntry = {
  id: string
  type: ContentType
  title: string
  route: RouteTarget
  tags: readonly ContentTag[]
  level: ContentLevel
  status: ContentStatus
  relatedLabIds?: readonly string[]
  relatedCaseIds?: readonly string[]
}
```

ID 在统一命名空间内使用稳定前缀（如 `course:`、`case:`、`lab:`、`video:`、`paper:`），但 `route.options` 仍引用旧 ID。例如 registry 的 `case:rag-budget` 可导航到 `{ page: 'strategy-case', options: { case: 'rag-budget' } }`，不会替换 localStorage 或 URL 中的 `rag-budget`。

分片文件可从已有目录导出轻量投影；若原文件混合了大量正文，则在 registry 分片中维护最小元数据，并用测试与关联校验防止入口漂移。`index.ts` 不允许被 `business.tsx`、`ProductHeader` 或其他应用壳静态导入。各聚合页作为 lazy chunk 消费所需分片，首页只消费课程摘要和进度所需最小投影。

**备选方案：**

- 立即把所有正文搬进统一 schema：改动面过大、回归风险高，违反本轮非目标。
- 单个巨型 registry 文件静态导入全部旧数据：实现简单但会把大型数据拉入首页或应用入口，违反性能目标。
- 运行时从 JSON/CMS 拉取：引入部署和失败面，且超出无后端约束。

### 4. 校验器同时服务测试和开发运行时，生产端隔离坏条目

`validateRegistry(entries, routeContract, vocabulary)` 返回结构化问题数组，不直接依赖 React。校验包括：

1. 全局 ID 唯一；
2. `route.page` 属于 canonical page/别名契约，`options` 键属于 `routeKeys`；
3. 标签、层级和状态来自受控词表；
4. `relatedLabIds` 与 `relatedCaseIds` 目标存在且类型匹配；
5. 可见条目具备标题和可用入口。

`src/content/registry.test.mjs` 在测试期对完整 registry 断言零问题，并用最小坏数据覆盖每种失败。开发模式在 registry 组装后执行同一校验并输出带 entry ID/字段的错误。生产聚合页通过 `partitionValidEntries` 隔离异常条目；若无有效数据，则渲染 `RegistryFallback`，提供刷新、清除筛选和返回首页操作。这样不为校验失败牺牲整个应用可用性。

**备选方案：**只依赖 TypeScript。类型系统不能发现重复 ID、悬空关系或合法字符串中的非法路由，因此不采用。

### 5. 聚合筛选使用纯 selector 与 URL 无关的本地 UI 状态

`selectors.ts` 提供无副作用的 `selectContent(entries, query)`，查询字段包括类型、标签、层级、状态和关联对象。三个聚合页共享 `ContentFilters`、`ContentGrid`、`ContentEmptyState` 和 `RegistryFallback`，但保留各自的信息层级与卡片变体。

本轮筛选状态使用组件本地 state，不引入状态库，也不把新筛选参数写入现有路由契约，避免扩大兼容范围。筛选控件使用原生 button/select/fieldset 语义，结果摘要使用 `aria-live="polite"`；空结果提供“清除筛选”。

**备选方案：**把筛选全部编码到 URL。可分享性更好，但会新增参数兼容与历史记录复杂度；本轮先保持范围收敛。

### 6. 所有页面实现都经过 lazy 页面表，应用壳不再静态导入首页或大数据

新增 `src/pageRegistry.tsx`，仅声明 `Page -> lazy importer/render adapter`。`business.tsx` 保留 URL 状态、壳组件、焦点恢复和统一 `Suspense`/错误边界，不再静态导入 `UnifiedMap`、`courseData`、`expertData` 或任一页面实现。对需要不同 props 的页面，用小型 lazy adapter 包装，而不是在壳层导入数据。

示意：

```ts
const pages = {
  'unified-map': lazy(() => import('./components/foundation/UnifiedMap')),
  routes: lazy(() => import('./components/hubs/LearningRoutesHub')),
  toolbox: lazy(() => import('./components/hubs/ResourcesHub')),
  // 其余旧页面保持独立 importer
}
```

`PageLoading` 保持非空，增加 `role="status"`、可见标题和 `aria-live`。新增 `PageLoadErrorBoundary` 捕获动态导入失败并提供重试/回首页；壳和导航始终保留。

**备选方案：**继续在 `business.tsx` 内维护 if 链并只 lazy 一部分页面。它容易再次引入静态页面依赖，也难以自动测试全部路由边界，不采用。

### 7. CSS 所有权下沉到 lazy 页面，壳样式最小化

只允许 `src/main.tsx` 静态导入 `src/index.css` 和应用壳共享样式。现有样式按下列路径下沉：

- `src/learning-os.css`：拆出 `src/styles/shell.css`（header、main、footer、skip link、loading/error）并保留/迁移首页规则到 `UnifiedMap` 所属样式、聚合页规则到 hub 样式。
- `src/lab.css` -> `components/Experiments.tsx`；`src/expert.css` -> 专家页 lazy 边界；`src/agent.css` -> Agent 页边界。
- `src/foundation.css`、`src/overconfident-case.css` -> foundation 页面边界。
- `src/distill.css`、`src/agent-book.css`、`src/decisionMath.css`、`src/mathPrimer.css` -> 对应 lazy 页面边界。
- `components/strategy/strategyCases.css` -> 案例页面边界。
- `src/videoLibrary.css`、`src/paperLibrary.css`、`src/paperLabs.css`、`src/resourceLearningLoop.css` -> 对应资源/论文实验边界。
- `components/hubs/coBuildHub.css` -> `CoBuildHub.tsx`。
- `components/feedback/feedback.css` 若反馈仍属于壳层可保留共享，否则随反馈弹层首次加载；优先保证交互无闪烁。

Vite 会基于动态导入自动生成关联 CSS chunk。共享选择器不得通过跨页面副作用维持布局；迁移时先复制归属、验证，再删除 `business.tsx` 顶层导入。

**备选方案：**只依赖 Vite `manualChunks` 拆 CSS。CSS 的拆分由导入图决定，单改 Rollup 配置不能解决顶层静态导入，因此不采用。

### 8. Recharts 维持显式重型 chunk，必要时在页面内二级 lazy

`vite.config.ts` 将 React 运行时和 Recharts 分别命名分块；所有引用 Recharts/AreaChart 的实验组件必须位于路由 lazy 边界之后。对一个页面中“目录轻、图表重”的情况，在图表区域使用二级 `lazy`，避免只查看目录就下载图表实现。首页与三个聚合页不得引用图表模块。

这延续现有独立 `AreaChart` 产物，同时防止 registry 或首页通过反向依赖把它拉回入口。

**备选方案：**替换图表库或自行绘图。会产生大规模视觉和行为回归，不属于本轮范围。

### 9. 性能门禁同时检查总量、首屏和产物拓扑

修改 `scripts/check-bundle.mjs`，保留现有 raw 统计并增加 manifest/HTML 入口分析。开始实施前将同一环境下的精确字节数写入不可漂移的 baseline 常量或版本化 JSON：

| 指标 | 当前观测值 | 目标/上限 |
| --- | ---: | ---: |
| JS 总 raw | 1380.3 KiB | 不高于 1380.3 KiB |
| CSS 总 raw | 313.6 KiB | 不高于 313.6 KiB |
| JS + CSS raw | 1693.9 KiB | 不高于 1693.9 KiB |
| 最大 chunk raw | 394.6 KiB | 不高于 394.6 KiB |
| 入口 JS raw | 约 355.7 KiB，实施前记录精确值 Bjs | `<= floor(Bjs × 0.80)`，按当前约 284.6 KiB |
| 首屏 CSS raw | 313.6 KiB 基线 | `<= floor(Bcss × 0.65)`，即约 203.8 KiB |

所有比较使用未四舍五入的字节数，KiB 只用于展示。新增 `scripts/check-route-chunks.mjs` 或在同一脚本中读取 Vite manifest，断言首页、学堂、实验室、工具箱和详情页有异步 JS，入口 HTML 未同步加载全部页面 CSS，Recharts 仍独立。预算值不得为了通过 CI 而提高；真正基线调整需单独说明原因和证据。

**备选方案：**只检查总 JS/CSS。它无法防止“总量不变但首屏仍加载一切”，因此必须增加入口和拓扑检查。

### 10. 自动化与视觉验证分层

- 纯函数测试：registry 校验、selector 组合、路由分区映射。
- 源码/组件测试：五入口数量与顺序、旧 URL 和 8 类参数、非空 fallback、键盘菜单与 reduced-motion 契约。
- 构建测试：lazy JS/CSS chunk、入口依赖、Recharts 独立、六项 raw 预算。
- 全量回归：现有 174 项测试全部通过，再计入新增测试。
- `html_vision` 人工视觉检查：首页、学堂、工具箱、一个机制案例深链，以及移动端五入口折叠、筛选空状态、加载/错误兜底；分别检查默认与 `prefers-reduced-motion`。

不使用仅靠截图像素相等的方式判定可访问性；视觉检查与键盘/语义断言互补。

## Concrete File Plan

### 新增文件

- `src/navigation.ts`：五入口配置及全部 page 的分区兼容映射。
- `src/pageRegistry.tsx`：页面 lazy importer 与 props adapter。
- `src/components/shell/PageLoadErrorBoundary.tsx`：页面 chunk 错误兜底。
- `src/components/hubs/ResourcesHub.tsx`：工具箱聚合页。
- `src/components/content/ContentFilters.tsx`：共享筛选控件。
- `src/components/content/ContentGrid.tsx`：统一结果容器及类型化卡片分发。
- `src/components/content/ContentEmptyState.tsx`：空结果。
- `src/components/content/RegistryFallback.tsx`：registry 错误降级。
- `src/content/types.ts`、`src/content/vocabulary.ts`、`src/content/selectors.ts`、`src/content/validateRegistry.ts`。
- `src/content/registry/courses.ts`、`cases.ts`、`labs.ts`、`resources.ts`、`index.ts`。
- `src/content/registry.test.mjs`、`src/content/selectors.test.mjs`、`src/navigation.test.mjs`。
- `src/styles/shell.css`、`src/styles/home.css`、`src/styles/hubs.css`、`src/styles/toolbox.css`。
- `scripts/check-route-chunks.mjs`（若未合并进 bundle 脚本）。

### 修改文件

- `src/routeConfig.ts`：新增 `toolbox` canonical page，保持原 34 个 page、别名、参数和默认页不变，并导出校验所需契约。
- `src/business.tsx`：使用 lazy 页面表，删除页面/大型数据/业务 CSS 静态导入，保留 History、焦点和 reduced-motion 行为。
- `src/components/shell/ProductHeader.tsx`：改用五入口配置和兼容归属映射，保留工具按钮与移动菜单行为。
- `src/components/shell/PageLoading.tsx`：补齐可见、可感知的非空加载状态。
- `src/components/foundation/UnifiedMap.tsx`：只读取轻量 registry 摘要，移除大型静态数据依赖，保持既有进度 ID。
- `src/components/hubs/LearningRoutesHub.tsx`、`LabsHub.tsx`：改为 registry selector 驱动并接入筛选/兜底。
- `src/components/resources/VideoLibrary.tsx`、`PaperLibrary.tsx`：复用 registry 路由/元数据但保持旧直达页面。
- `src/searchIndex.ts`：从 registry 投影可搜索元数据，避免再维护平行顶层和内容入口。
- `src/learning-os.css` 及 `src/*.css`、`src/components/**/*.css`：按页面归属拆分导入；不改变品牌视觉。
- `vite.config.ts`：显式保持 React 与 Recharts 分块并开启构建 manifest（供门禁使用）。
- `scripts/check-bundle.mjs`：加入精确 baseline、入口和首屏指标、总量与最大 chunk 检查。
- `package.json`：把 chunk 检查加入现有 `ci:check`（若使用独立脚本），不新增依赖。
- `src/health/catalog.test.mjs`、`src/health/route-index.test.mjs`：覆盖 registry 和新工具箱路由，同时断言旧路由不丢失。
- 与 `ProductHeader`、聚合页和 a11y 对应的既有测试/静态检查文件：增加五入口、筛选、fallback、键盘和 reduced-motion 断言。

## Risks / Trade-offs

- [统一 registry 可能再次成为巨型入口依赖] → 按内容类型分片，只在 lazy 页面内合并；CI 检查首页静态依赖图。
- [最小元数据与旧正文元数据可能漂移] → 优先从现有 catalog 投影；无法投影时通过唯一 ID、路由和关联测试建立双向约束。
- [CSS 下沉后出现样式闪烁或共享规则缺失] → 先标记规则所有权，再逐页迁移；壳层保留必要 token/layout；对关键深链做冷加载视觉检查。
- [共享 CSS 被 Vite 再次抽成首屏资源] → 用 manifest 检查入口实际依赖，而非仅检查文件名；必要时拆小共享模块。
- [新增 `toolbox` 使 canonical page 从 34 增至 35] → 只追加、不重排、不重命名；测试显式断言原 34 项仍是子集。
- [旧页面导航归属存在认知争议] → 将映射集中在 `navigation.ts` 并逐页测试；映射只影响高亮，不影响 URL 或渲染。
- [动态图表 chunk 仍接近最大 chunk 上限] → 保持显式 Recharts 分块，并在实际渲染点二级 lazy；不在本轮替换图表库。
- [入口 JS 降幅受共享壳和搜索索引影响] → 延迟加载搜索索引/命令面板内容，把大型数据投影留在搜索打开或目标页面 chunk。
- [错误兜底掩盖 registry 缺陷] → 测试与开发环境校验必须失败/显著告警；生产隔离仅用于保持可用性。
- [测试数“174”随新增测试增长后表述失真] → 门禁分别记录“174 项既有测试全通过”和“新增测试全通过”，不把总数硬编码为 174。

## Migration Plan

1. **冻结与测量**：确认工作树中仅 AimeSpec 文档变更；记录原 34 个 page、别名、路由参数、进度/存储 ID、174 项测试和精确构建字节基线。不得修改或回退机制沙盒提交。
2. **建立契约**：先新增 registry 类型、受控词表、路由目标类型、校验器和失败用例；再录入/投影最小元数据，直到完整 registry 校验通过。
3. **建立兼容层**：新增 `navigation.ts` 和 `toolbox` page，只追加路由；补齐原 34 页面、旧别名、所有参数与进度 ID 的兼容测试。
4. **迁移聚合页**：先实现共享 selector/筛选/兜底，再依次迁移学堂、实验室，最后新增工具箱；每迁移一页即删除该页平行入口数组并运行聚合测试。
5. **收口导航**：将 `ProductHeader` 切换到五入口配置；验证桌面单行、移动折叠、键盘焦点、Escape 和 reduced-motion。
6. **拆页面 JS**：引入 `pageRegistry.tsx` 与加载错误边界；先 lazy 首页，再移除 `business.tsx` 的页面和大型数据静态导入，最后逐个验证全部旧深链。
7. **拆 CSS**：先提取 shell CSS，再按页面边界下沉业务 CSS；每批迁移后冷启动对应页面，防止依赖缓存掩盖缺失样式。
8. **加严构建门禁**：启用 manifest，扩展 bundle/chunk 检查；达到入口 JS -20%、首屏 CSS -35%，且总量和最大 chunk不回归。
9. **完整验证**：运行 lint、类型检查、174 项既有测试、全部新增测试、静态 a11y、生产构建和 bundle 检查；再执行规定的 `html_vision` 桌面/移动视觉验证。
10. **发布与回滚**：该变更是静态前端增量，无数据迁移。若聚合页或分块出现生产问题，回滚实现提交即可；由于旧 URL、旧页面和旧存储从未删除，无需数据回滚。不要通过删除 registry 条目或重置用户进度来回滚。

## Open Questions

无阻塞问题。实现时必须在步骤 1 用同一 Node/pnpm/Vite 环境记录未四舍五入的入口 JS 与首屏 CSS 字节数；文档中的 355.7 KiB 和 303.0/313.6 KiB 仅用于人工阅读，自动门禁以精确字节基线和 20%/35% 公式为准。
