## MODIFIED Requirements

### Requirement: 可执行的 raw bundle 预算
系统 SHALL 继续使用上一轮在 Node 20+/pnpm 10/Vite 环境冻结的未压缩精确字节门禁，并在构建后自动检查：总 JS 不超过 1,413,471 B、总 CSS 不超过 321,108 B、JS 与 CSS 合计不超过 1,734,579 B、最大 chunk 不超过 404,116 B、入口 JS 不超过 `floor(364,266 × 0.80) = 291,412 B`、首屏 CSS 不超过 `floor(310,316 × 0.65) = 201,705 B`。mission-driven-learning 实现 MUST NOT 放宽这些上限；若实现前同一门禁记录的实际产物比上限更小，入口 JS、首屏 CSS、总 bundle 和最大 chunk 还 MUST 不超过该实现前产物快照，防止本变更消费既有余量。

#### Scenario: Mission 变更通过预算
- **WHEN** CI 或本地质量门禁完成生产构建并运行 bundle 检查
- **THEN** 报告总 JS、总 CSS、JS 与 CSS合计、最大 chunk、入口 JS 和首屏 CSS的 raw 字节数及相对冻结值变化
- **AND** 六项均不超过既有门禁，且入口 JS、首屏 CSS、总 bundle、最大 chunk 不超过本变更实施前产物快照

#### Scenario: 任一指标超限
- **WHEN** 构建产物的入口 JS、首屏 CSS、总 JS、总 CSS、总 bundle 或最大 chunk 任一指标超过适用阈值
- **THEN** bundle 检查以非零状态失败并指出超限资源、当前字节数、阈值和差值

#### Scenario: 防止预算漂移
- **WHEN** 实现者仅提高预算常量或更新实施前快照以使失败构建通过
- **THEN** 评审 SHALL 将该变更视为未满足性能验收
- **AND** 真正的基线调整必须脱离本变更单独说明原因和证据

## ADDED Requirements

### Requirement: Mission UI 保持轻量与依赖隔离
MissionBrief、影子策略、delta、压力测试、复盘卡和能力矩阵 MUST 使用现有 React、原生 HTML/CSS 与现有图标能力实现；本变更 MUST NOT 新增 package 依赖，MUST NOT 导入 Recharts，并 MUST 保持案例详情与进度页位于既有 lazy route chunk，避免 mission 代码进入应用入口或无关聚合页。

#### Scenario: 构建依赖拓扑
- **WHEN** 完成生产构建并检查 Vite manifest 与依赖清单
- **THEN** package 依赖相对变更前没有新增项，mission 组件不依赖 Recharts
- **AND** mission 实现仅随案例详情或进度页等使用它的异步 chunk 加载

#### Scenario: 无 mission 页面不承担任务代码
- **WHEN** 用户首次打开首页以外的无关课程、资源或聚合页面
- **THEN** 入口及该路由的静态依赖不因本变更加载案例专用压力测试或比较实现
- **AND** Recharts 仍只在原有图表边界按需加载
