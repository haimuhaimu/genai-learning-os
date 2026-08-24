## 技术栈识别

项目采用 React、TypeScript、Vite 与 pnpm，使用 QueryString 管理页面与实验深链。所有实验均在浏览器内执行确定性计算，学习状态通过 localStorage 保存，不依赖后端服务。

## 目录结构梳理

- `src/components/strategy/`：Strategy Case、策略摘要与案例内资源面板。
- `src/components/resources/`：视频库、论文库与资源卡片。
- `src/components/*Labs.tsx`：现有基础算法、LLM、图像与 Agent 实验。
- `src/resources/`：视频和论文 Catalog，以及静态校验测试。
- `src/progress.ts`、`src/strategyEvidence.ts`：本地学习进度与策略证据。
- `src/routeConfig.ts`、`src/business.tsx`：QueryString 路由契约和页面分发。

## 开发规范总结

- 新交互优先采用纯函数计算与固定输入，保证结果确定、可测试。
- 本地数据读取失败时应安全降级，不能阻断课程使用。
- 外部资源不嵌入、不自动播放，统一通过安全新窗口打开。
- 新页面必须接入路由、全局搜索、移动端样式、无障碍语义和静态健康检查。
- 不引入新依赖，不改变现有学习进度和策略证据的语义。

## Why

当前视频与论文资源已经足够丰富，但学习者仍容易停留在“打开链接、看过内容”的浅层状态，也无法通过操作亲自验证论文机制。本次 P0 优化将资源消费变成可回看的学习闭环，并把五篇代表论文转化为可计算、可解释的交互实验。

## What Changes

- 在 Strategy Case 中加入“首次判断—补充资源—复盘判断—前后对比”学习闭环。
- 记录用户主动打开的视频或论文，但不推断观看完成度，也不上传学习数据。
- 为案例补充关联论文入口，使视频和论文都能回流到同一个复盘环节。
- 新增论文复现实验室，支持 Transformer、Wide & Deep、DDPM、ReAct 和 DreamerV3 五个确定性实验。
- 在论文卡片中为有实验的论文增加“交互复现”入口。
- 为学习闭环和五个实验补充纯函数测试、路由检查、文档与移动端适配。

## Capabilities

### New Capabilities

- `resource-learning-loop`：在 Strategy Case 内完成首次回答、资源触达、复盘回答和前后对比，并在本机持久化。
- `interactive-paper-labs`：为五篇代表论文提供无需后端、可分享深链、可确定性验证的交互式机制复现。

### Modified Capabilities

无。

## Impact

- 新增本地学习闭环状态模块与 Case 内闭环组件。
- 新增论文实验注册表、统一实验室页面、五组纯函数与实验组件。
- 修改 Strategy Case Runner、视频/论文卡片、论文库、路由、搜索索引与样式。
- 新增单元测试、路由健康检查和 P0 功能说明文档。
- 无 API、数据库或第三方依赖变更；现有 localStorage 数据保持兼容。
