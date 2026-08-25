# route-performance-budget Specification

## Purpose
TBD - created by archiving change consolidate-content-performance. Update Purpose after archive.
## Requirements
### Requirement: 路由级页面懒加载
系统 SHALL 让应用壳之外的页面实现通过 `React.lazy` 或等价动态导入按路由加载，并 SHALL 在 `Suspense` 边界中提供非空加载界面。应用入口 MUST NOT 因路由分发而静态导入首页、聚合页、课程、案例、实验、视频、论文或评审页面实现。

#### Scenario: 首次访问单一路由
- **WHEN** 用户首次打开任一合法页面
- **THEN** 浏览器只请求应用壳、该页面及其必要共享依赖对应的初始资源
- **AND** 其他无关页面实现保留在未加载的异步 chunk 中

#### Scenario: 懒加载期间显示反馈
- **WHEN** 页面 chunk 尚未完成下载或执行
- **THEN** 主内容区域显示非空加载标题或状态
- **AND** 加载状态可被辅助技术感知且不会造成无标签的空白页面

#### Scenario: 懒加载失败可恢复
- **WHEN** 页面动态导入失败
- **THEN** 系统显示清晰错误说明和重试或返回首页操作
- **AND** 全局导航保持可用

### Requirement: 业务 CSS 跟随页面边界
系统 SHALL 仅在入口样式中保留 reset、设计令牌和应用壳等首屏共享 CSS；课程、案例、实验、资源与其他页面专属 CSS SHALL 由对应 lazy 页面或页面分组导入并随异步 chunk 加载。若少量共享规则无法立即迁移，首屏 CSS raw 仍 MUST 相对 313.6 KiB 基线至少下降 35%，即不高于 203.8 KiB。

#### Scenario: 首页首载不请求无关业务 CSS
- **WHEN** 用户首次打开首页且未导航到实验、资源或课程页面
- **THEN** 初始 HTML 不预加载这些页面专属 CSS
- **AND** 首屏 CSS raw 总量不高于 203.8 KiB

#### Scenario: 导航后加载页面样式
- **WHEN** 用户首次导航到需要专属样式的页面
- **THEN** 浏览器随该页面异步边界加载对应 CSS chunk
- **AND** 页面完成加载后不因缺失样式出现不可用布局

### Requirement: 重型可视化依赖保持独立
系统 MUST 让 Recharts 以及包含 `AreaChart` 等重型图表实现的代码保持在独立异步 chunk 中；首页、学堂、案例中心、实验室目录和工具箱未渲染图表时 MUST NOT 通过静态依赖链把该 chunk 纳入入口资源。

#### Scenario: 首页不加载图表 chunk
- **WHEN** 用户打开首页且未进入含图表的实验
- **THEN** 初始资源请求不包含 Recharts/AreaChart chunk

#### Scenario: 打开图表实验后按需加载
- **WHEN** 用户进入实际渲染 Recharts 图表的页面
- **THEN** 图表 chunk 被异步请求并正常渲染
- **AND** 该 chunk 与 React 运行时和应用入口 chunk 分离

### Requirement: 首页避免静态导入大型数据
首页及应用壳 MUST NOT 静态导入完整课程正文、大型实验数据、视频全集、论文全集或案例正文。首页所需摘要 SHALL 使用轻量投影、按需导入或 registry 中的最小元数据，以避免大型数据进入入口 JS。

#### Scenario: 检查首页依赖图
- **WHEN** 构建工具生成首页入口及其静态依赖图
- **THEN** 依赖图不包含完整视频、论文、实验或案例正文数据模块
- **AND** 首页仍能展示导航、推荐和继续学习所需的轻量信息

### Requirement: 可执行的 raw bundle 预算
系统 SHALL 以变更前构建产物记录可复现的 raw 基线，并在构建后自动检查：总 JS 不超过现有 JS 预算、总 CSS 不超过 313.6 KiB 的现有 CSS 预算、JS 与 CSS 合计不超过现有总预算、最大 chunk 不超过现有最大 chunk 预算；预算常量 MUST NOT 为使失败构建通过而放宽。入口 JS raw MUST 相对记录的入口 JS 基线至少下降 20%，首屏 CSS raw MUST 相对 313.6 KiB 至少下降 35%。

#### Scenario: 优化后产物通过预算
- **WHEN** CI 或本地质量门禁完成生产构建并运行 bundle 检查
- **THEN** 报告总 JS、总 CSS、JS 与 CSS 合计、最大 chunk、入口 JS 和首屏 CSS 的 raw 字节数及相对基线变化
- **AND** 入口 JS 降幅至少 20%、首屏 CSS 降幅至少 35%，其余指标均不超过现有预算

#### Scenario: 任一指标超限
- **WHEN** 构建产物的入口 JS、首屏 CSS、总 JS、总 CSS、总 bundle 或最大 chunk 任一指标超过阈值
- **THEN** bundle 检查以非零状态失败并指出超限资源和字节差值

#### Scenario: 防止预算漂移
- **WHEN** 实现者仅提高预算常量而没有提交经批准的新基线说明
- **THEN** 评审 SHALL 将该变更视为未满足性能验收

### Requirement: 产物拆分可回归验证
系统 SHALL 通过构建产物测试验证关键路由存在独立 lazy chunk、页面 CSS 不全部汇入入口 CSS、重型图表 chunk 独立，并 SHALL 在同一回归门禁中执行现有测试套件。

#### Scenario: 检查 lazy chunk 产物
- **WHEN** 完成生产构建
- **THEN** 首页、学堂、实验室、工具箱及至少一个详情页面具有可识别的异步 JS 产物
- **AND** 入口 HTML 不把全部页面 chunk 作为同步脚本加载

#### Scenario: 既有测试不回归
- **WHEN** 执行完整自动化测试
- **THEN** 变更前已有的 174 项测试全部通过
- **AND** registry、导航、路由兼容、聚合筛选、chunk 和 bundle 新增测试同时通过
