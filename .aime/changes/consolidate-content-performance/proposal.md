## Why

当前站点已增长到 34 个页面、约 10 个顶层入口，内容分散在课程、案例、实验、视频和论文等多套目录与清单中；同时 `business.tsx` 顶层加载大量业务 CSS，使首屏资源接近预算上限。现在需要在不删除内容、不破坏旧 URL 与进度数据的前提下，先收口信息架构和内容管理层，再用路由级拆分建立可持续的性能边界。

## What Changes

- 将顶层信息架构稳定为 5 个入口：**首页、学堂、案例、实验室、工具箱**；桌面端保持单行可用，空间不足时折叠为键盘可操作的移动导航。
- 明确首页 `UnifiedMap` 是全站总览与推荐起点，学堂 `LearningRoutesHub` 是结构化学习路径聚合；案例中心保持案例入口，所有实验从 Labs 聚合页发现，视频与论文归入工具箱资源区。
- 保留全部旧页面、旧 `page` 参数、深链参数与已有进度 ID，通过兼容映射把旧顶层入口归属到 5 个导航分区；旧直达入口继续可用，不做破坏性迁移。
- 新增统一内容 registry 管理层，统一记录内容 ID、类型、标题、入口路由、标签、层级、发布状态及关联实验/案例；本轮适配现有数据源，不强制迁移所有正文 schema。
- 在运行时开发环境及测试期校验 registry：内容 ID 唯一、路由合法、标签来自受控集合、关联对象存在；校验失败时聚合页显示清晰兜底，而不是空白或崩溃。
- 让新学堂、实验室和工具箱聚合页由 registry 驱动，并提供可访问的分类、标签和状态筛选以及明确的空结果状态。
- 对页面实现与页面 CSS 做路由级 `React.lazy`/`Suspense` 拆分；加载 fallback 必须非空且可被辅助技术感知；Recharts/AreaChart 等重型可视化继续保持独立分块，首页不得静态导入大数据集。
- 将当前 raw 基线纳入预算检查：JS 1380.3 KiB、CSS 313.6 KiB、总计 1693.9 KiB、最大 chunk 394.6 KiB。验收目标为首屏 CSS raw 至少下降 35%、入口 JS raw 至少下降 20%，总 bundle 不高于当前基线预算，最大 chunk 不高于 394.6 KiB。
- 扩展自动化测试，覆盖 registry 校验、旧 URL 兼容、5 个导航入口、聚合筛选、lazy chunk 产物、bundle 体积和现有 174 项测试不回归；以 `html_vision` 人工检查首页、学堂、工具箱、机制案例深链和移动端。
- 明确非目标：不新增课程、不删除内容、不改品牌、不引入 CMS 后端或新状态库、不在本轮完全统一所有正文组件。

### 新 IA

```text
GenAI Learning OS
├── 首页       UnifiedMap：全站总览、推荐与继续学习
├── 学堂       LearningRoutesHub：课程与结构化学习路径
├── 案例       StrategyCaseCenter：案例浏览与案例深链
├── 实验室     LabsHub：全部实验的统一发现入口
└── 工具箱     ResourcesHub：视频 + 论文等参考资源

兼容层（不作为新增顶层入口）
旧 page/参数 ──> 原页面继续直达 ──> 映射到上述导航分区
```

### 技术栈识别

- 前端：React 18.3 + TypeScript 5.6，函数组件、Hooks、`React.lazy`/`Suspense`。
- 构建：Vite 6、ES Modules、pnpm 10、Node.js 20+；Rollup 当前仅手工拆分 React。
- 样式：Tailwind CSS 3 + PostCSS，并存页面级 CSS；当前主要问题是 `src/business.tsx` 顶层导入 17 个业务样式文件。
- 图表与图标：Recharts 2.15、lucide-react。
- 路由与状态：基于 URL 查询参数和 History API 的轻量路由，本地进度使用既有 ID 与浏览器存储；不依赖第三方路由或状态库。
- 质量门禁：TypeScript strict、ESLint、Node test runner + tsx、自定义静态可访问性和 bundle 检查脚本。

### 目录结构梳理

```text
src/
├── business.tsx                 # 应用壳、查询参数路由、页面装配
├── routeConfig.ts               # 34 个 canonical page、别名与深链参数
├── *Data.ts / learningPath.ts   # 课程与路径数据
├── resources/                   # 视频、论文清单及其测试
├── components/
│   ├── shell/                   # ProductHeader、加载态、搜索等应用壳
│   ├── hubs/                    # LearningRoutesHub、LabsHub 等聚合页
│   ├── strategy/                # 案例 registry、案例中心与机制案例
│   ├── paperLabs/               # 论文实验及局部 registry
│   ├── foundation/、distill/    # 课程、实验与进度页面
│   └── resources/               # 视频/论文页面组件
├── health/                      # 清单与路由健康检查
└── *.css                        # 壳层及多套业务页面样式
scripts/                         # 测试、a11y、bundle 门禁
.aime/specs/                     # 已归档能力规范
```

### 开发规范总结

- 遵循 TypeScript strict、禁止未使用变量/参数、ESM 和现有无分号代码风格；组件使用函数组件与 Hooks。
- 路由只能使用 `routeConfig.ts` 声明的页面及参数，新增入口必须兼容浏览器前进/后退、深链与未知值安全回退。
- 不修改现有进度 ID、案例 ID、论文 ID 或存储键；registry 只做管理与适配，不成为正文 schema 的强制替代。
- 可交互元素使用原生语义、清晰标签、可见焦点和键盘流程；动画/滚动尊重 `prefers-reduced-motion`。
- 新页面与业务 CSS应跟随 lazy 页面边界加载；共享壳层 CSS 才能进入入口包；大数据不得由首页静态导入。
- 变更必须通过 lint、类型检查、174 项既有测试、增量测试、静态 a11y、构建及 bundle 预算检查。

## Capabilities

### New Capabilities

- `stable-information-architecture`: 定义 5 个稳定顶层入口、聚合页角色、重复入口归并、响应式导航及旧 URL/进度兼容行为。
- `content-registry`: 定义统一内容元数据、受控标签与关联关系、运行时/测试期校验，以及学堂、实验室、工具箱的 registry 驱动聚合和兜底行为。
- `route-performance-budget`: 定义路由级懒加载、CSS 与重型依赖分块、非空加载态，以及以当前 raw 基线衡量的首屏和总 bundle 性能门禁。

### Modified Capabilities

无。现有 `interactive-paper-labs` 和 `resource-learning-loop` 的需求继续成立；本轮只通过新能力聚合入口并保留既有深链和行为。

## Impact

- 预计实现阶段会影响 `src/business.tsx`、`src/routeConfig.ts`、`src/components/shell/ProductHeader.tsx`、`src/components/foundation/UnifiedMap.tsx`、`src/components/hubs/`、`src/components/resources/`、内容数据适配层、页面 CSS 入口、`vite.config.ts`、`scripts/check-bundle.mjs` 及相关测试。
- 不新增运行时依赖、CMS 服务或状态库；registry 先消费现有课程、案例、论文、视频和实验数据。
- 对外 URL 与本地数据无破坏性变化：34 个页面仍可访问，旧查询参数和已有进度 ID 原样保留。
- 当前分支已有的机制沙盒提交属于受保护基线，实施时不得修改、撤销或重写其内容与历史。
