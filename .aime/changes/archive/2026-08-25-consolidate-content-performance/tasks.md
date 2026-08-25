## 1. 基线冻结与契约盘点

- [x] 1.1 在不改动或撤销当前分支两个机制沙盒提交的前提下，记录 `src/routeConfig.ts` 的原 34 个 canonical page、`map` 别名、8 类深链参数，以及所有现有进度 ID/存储键，形成兼容测试夹具。
- [x] 1.2 使用当前 Node 20+/pnpm 10/Vite 环境执行生产构建，记录未四舍五入的 JS 总量、CSS 总量、JS+CSS 总量、最大 chunk、入口 JS 和首屏 CSS 字节基线；核对人工基线 1380.3/313.6/1693.9/394.6 KiB。
- [x] 1.3 运行现有完整测试并保存 174 项既有测试的通过基线；确认后续新增测试与既有测试分别统计。

## 2. 内容 Registry 基础

- [x] 2.1 新增 `src/content/types.ts`，定义 `ContentType`、`ContentStatus`、`ContentLevel`、`RouteTarget` 和判别联合 `ContentEntry`，其中路由复用 `Page`/`RouteKey`，registry ID 与旧业务 ID 分离。
- [x] 2.2 新增 `src/content/vocabulary.ts`，集中声明受控标签、层级、状态和面向用户的显示文案，确保未知字符串不能进入合法条目。
- [x] 2.3 新增 `src/content/registry/courses.ts` 与 `cases.ts`，从既有路径/案例 catalog 投影课程、路线、案例的最小元数据，保留原 route options 和原案例/进度 ID。
- [x] 2.4 新增 `src/content/registry/labs.ts`，登记 foundation、expert、agent、agent-book、distill、paper 等全部实验入口和关联案例，保持原 `experiment`/`paper` 值。
- [x] 2.5 新增 `src/content/registry/resources.ts`，从 `videoCatalog.ts` 与 `paperCatalog.ts` 投影视频、论文最小元数据，并保持既有打开行为所需字段。
- [x] 2.6 新增 `src/content/registry/index.ts`，合并类型分片并建立只读 ID 索引；验证该入口不被 `business.tsx`、`ProductHeader` 或应用壳静态导入。
- [x] 2.7 新增 `src/content/validateRegistry.ts`，实现全局 ID 唯一、合法 page/route key、受控标签/层级/状态、必填入口和关联对象存在且类型匹配的结构化校验。
- [x] 2.8 在开发运行时接入同一校验器并输出可定位到条目 ID 和字段的错误；在生产查询中隔离无效条目而不是使应用白屏。

## 3. Registry 测试与选择器

- [x] 3.1 新增 `src/content/registry.test.mjs`，断言完整 registry 零错误，并分别覆盖重复 ID、非法路由、非法参数、非法标签、悬空关联和错型关联。
- [x] 3.2 新增 `src/content/selectors.ts`，实现按可见状态、内容类型、标签、层级及关联案例/实验组合筛选的无副作用 selector。
- [x] 3.3 新增 `src/content/selectors.test.mjs`，覆盖默认隐藏非公开条目、组合筛选、全部/视频/论文切换和无结果查询。
- [x] 3.4 更新 `src/health/catalog.test.mjs`，断言 registry 与既有课程、案例、实验、视频、论文 catalog 的 ID/入口投影无遗漏或漂移。

## 4. 五入口导航与旧路由兼容

- [x] 4.1 新增 `src/navigation.ts`，按首页、学堂、案例、实验室、工具箱声明且仅声明五个主入口，并为全部原 page 及新增 `toolbox` 提供明确分区映射。
- [x] 4.2 修改 `src/routeConfig.ts`，只追加 `toolbox` canonical page；保留原 34 个 page 的名称与顺序、`map` 别名、默认页和全部 route key。
- [x] 4.3 修改 `src/components/shell/ProductHeader.tsx`，从导航配置渲染五入口；搜索、反馈、分享和进度保留为工具，不计入主入口。
- [x] 4.4 保持桌面五入口单行可用，并在空间不足时折叠；补齐菜单 `aria-expanded`、可见焦点、视觉顺序键盘流和 Escape 关闭后焦点回归。
- [x] 4.5 新增 `src/navigation.test.mjs`，断言入口数量、名称、顺序、目标和每个 page 的兼容高亮分区。
- [x] 4.6 更新 `src/health/route-index.test.mjs`，断言原 34 个 page、旧别名、8 类深链参数仍有效，新 `toolbox` 可访问，未知 page/参数安全回退。
- [x] 4.7 增加存储兼容测试，使用变更前进度夹具验证首页、详情页和聚合页读取相同 ID 与值，且实现中没有重命名或清空存储键。

## 5. Registry 驱动的聚合页

- [x] 5.1 新增 `src/components/content/ContentFilters.tsx`，使用原生可访问控件实现类型、标签、层级筛选，并以 `aria-live="polite"` 反馈结果数量。
- [x] 5.2 新增 `src/components/content/ContentGrid.tsx`，按判别联合分发课程、案例、实验、视频和论文卡片，所有导航读取 registry 的 `RouteTarget`。
- [x] 5.3 新增 `src/components/content/ContentEmptyState.tsx`，在无匹配结果时显示原因和键盘可用的“清除筛选”操作。
- [x] 5.4 新增 `src/components/content/RegistryFallback.tsx`，在 registry 整体不可用时显示标题、说明以及刷新/返回首页操作，并保持全局导航可用。
- [x] 5.5 修改 `src/components/hubs/LearningRoutesHub.tsx`，删除手写路线平行数组，改由 registry 生成课程层级、路线、关联实验/案例及筛选结果；保持学堂的结构化路径职责。
- [x] 5.6 修改 `src/components/hubs/LabsHub.tsx`，删除手写实验分组，改为聚合 registry 中所有可见实验，并支持标签、层级和关联案例筛选。
- [x] 5.7 新增 `src/components/hubs/ResourcesHub.tsx`，在同一工具箱资源区聚合视频与论文，支持全部/视频/论文和标签筛选，复用既有资源卡片行为。
- [x] 5.8 保留并回归 `src/components/resources/VideoLibrary.tsx` 与 `PaperLibrary.tsx` 的旧直达页面，确保工具箱只整合发现入口，不删除旧页面。
- [x] 5.9 修改 `src/searchIndex.ts` 从 registry 投影顶层与内容入口，避免维护第二套视频、论文、案例和实验路由元数据，并将完整索引延迟到打开搜索时加载。
- [x] 5.10 增加聚合页测试，覆盖学堂/实验室/工具箱数据来源、组合筛选、空状态、坏条目隔离、整体失败兜底及卡片路由正确性。

## 6. 页面级 JS 懒加载与恢复体验

- [x] 6.1 新增 `src/pageRegistry.tsx`，为首页、学堂、案例、实验室、工具箱及全部旧页面声明 lazy importer/props adapter，且不在该表外静态导入页面实现。
- [x] 6.2 修改 `src/business.tsx` 使用页面表分发路由，删除 `UnifiedMap`、`courseData`、`expertData` 和其他页面/大型数据静态导入，同时保留 History、前进后退、焦点和滚动行为。
- [x] 6.3 修改 `src/components/foundation/UnifiedMap.tsx`，仅消费轻量 registry 摘要和既有进度 API，不静态导入完整视频、论文、实验或案例正文数据。
- [x] 6.4 修改 `src/components/shell/PageLoading.tsx`，提供可见标题、`role="status"` 和非空辅助技术文本。
- [x] 6.5 新增 `src/components/shell/PageLoadErrorBoundary.tsx`，捕获动态导入失败并提供重试/返回首页操作，确保壳和导航不消失。
- [x] 6.6 对仅部分区域需要图表的页面增加二级 lazy 边界，确保 Recharts/AreaChart 只在实际渲染图表时加载。
- [x] 6.7 增加页面加载测试，覆盖所有 page 都有异步 importer、加载 fallback 非空、chunk 失败可恢复及 `prefers-reduced-motion` 下无平滑滚动。

## 7. 页面级 CSS 拆分

- [x] 7.1 新增 `src/styles/shell.css`，只迁移设计令牌、header、main、footer、skip link、loading/error 等首屏共享规则，并由入口静态加载。
- [x] 7.2 新增 `src/styles/home.css`、`hubs.css`、`toolbox.css` 并分别由 `UnifiedMap`、学堂/实验室和工具箱 lazy 页面导入。
- [x] 7.3 将 `lab.css`、`expert.css`、`agent.css`、`foundation.css`、`overconfident-case.css`、`distill.css`、`agent-book.css` 下沉到对应课程/实验 lazy 边界，并移除 `business.tsx` 顶层导入。
- [x] 7.4 将 `strategyCases.css`、`decisionMath.css`、`mathPrimer.css`、`videoLibrary.css`、`paperLibrary.css`、`paperLabs.css`、`resourceLearningLoop.css`、`coBuildHub.css` 下沉到对应 lazy 页面边界。
- [x] 7.5 审查 `feedback.css` 的壳层依赖；保留首次交互必须的最小规则，其余随反馈弹层加载，并确保打开时无不可用闪烁。
- [x] 7.6 清理 `learning-os.css` 中已迁移规则和跨页面副作用，确保 `main.tsx`/应用壳只静态导入 `index.css` 与最小 shell CSS。
- [x] 7.7 冷启动逐页验证关键旧深链的 CSS chunk 被按需请求且布局完整，避免缓存掩盖漏导入问题。

## 8. 构建分块与性能门禁

- [x] 8.1 修改 `vite.config.ts` 开启 manifest，并显式保持 React 与 Recharts 为独立共享 chunk；确认首页和三个聚合页不依赖 Recharts。
- [x] 8.2 扩展 `scripts/check-bundle.mjs`，用精确字节检查 JS 总量、CSS 总量、JS+CSS 总量和最大 chunk 均不超过冻结基线，并输出资源名、字节数和差值。
- [x] 8.3 在 bundle 检查中解析入口 HTML/manifest，断言入口 JS 相对精确基线至少下降 20%，首屏 CSS 相对 313.6 KiB 精确基线至少下降 35%（目标不高于约 203.8 KiB）。
- [x] 8.4 新增 `scripts/check-route-chunks.mjs` 或等价检查，断言首页、学堂、实验室、工具箱和至少一个详情页存在异步 JS，页面 CSS 未全部汇入入口 CSS，Recharts/AreaChart 保持独立。
- [x] 8.5 若使用独立产物脚本，修改 `package.json` 将其加入 `ci:check`；不得新增运行时依赖或为通过检查提高预算。
- [x] 8.6 执行生产构建和全部 bundle/chunk 门禁，保存报告证明入口 JS 至少 -20%、首屏 CSS 至少 -35%，且总 JS、总 CSS、总量和最大 chunk 均未回归。

## 9. 自动化质量回归

- [x] 9.1 运行 TypeScript build/typecheck 与 ESLint，修复所有 strict、未使用符号、Hook 和 import 副作用问题。
- [x] 9.2 运行完整 Node test suite，确认变更前 174 项测试全部通过并记录新增测试通过数。
- [x] 9.3 运行静态可访问性检查，确认五入口导航、筛选标签、加载/错误/空状态和键盘语义无新增问题。
- [x] 9.4 再次运行生产构建、route chunk 检查和 bundle 预算检查，确认结果可在干净环境重复。

## 10. html_vision 手动视觉验证（必须执行）

- [x] 10.1 使用 `html_vision` 在桌面视口检查首页 `?page=unified-map`：五入口单行、首页仅承担总览/推荐/继续学习、无横向溢出、加载态非空，且未出现品牌视觉变化。
- [x] 10.2 使用 `html_vision` 在桌面视口检查学堂 `?page=routes`：路线层级清晰、registry 卡片完整、筛选的默认/选中/空状态可辨识，UnifiedMap 与 LearningRoutesHub 职责不重复。
- [x] 10.3 使用 `html_vision` 在桌面视口检查工具箱 `?page=toolbox`：视频与论文处于同一资源区，全部/视频/论文切换及标签筛选状态清晰，资源卡片无截断或错位。
- [x] 10.4 使用 `html_vision` 冷加载至少一个当前分支已有的机制案例深链（例如 `?page=strategy-case&case=context-budget`，以实际既有 ID 为准）：内容、样式和进度不丢失，导航正确高亮“案例”，不得改动沙盒内容。
- [x] 10.5 使用 `html_vision` 在移动端视口分别检查首页、学堂、工具箱和上述机制案例深链：五入口折叠菜单可见、展开无溢出、焦点/选中态明确、卡片单列可读。
- [x] 10.6 在 `prefers-reduced-motion: reduce` 下重复检查菜单、页面切换、加载和筛选状态；确认无依赖动画才能理解的信息，并记录桌面/移动端截图或检查报告。
- [x] 10.7 手动以键盘完成菜单展开/遍历/Escape 关闭、聚合筛选/清除、从工具箱进入旧视频/论文页、从实验室进入旧实验深链，并核对 html_vision 结果与语义测试一致。

## 11. 完成与回滚准备

- [x] 11.1 汇总原 34 页面和新增工具箱路由的兼容矩阵、registry 校验报告、174 项既有测试报告、a11y 结果、html_vision 记录和六项性能指标。
- [x] 11.2 审查最终 diff，确认没有新增内容、删除页面、修改品牌、引入 CMS/状态库、统一全部正文 schema，且没有改动或撤销两个机制沙盒提交。
- [x] 11.3 记录发布回滚方式：仅回滚本轮实现提交，不清空 registry、旧页面或用户存储；若聚合页异常，旧直达 URL 仍作为恢复路径。
