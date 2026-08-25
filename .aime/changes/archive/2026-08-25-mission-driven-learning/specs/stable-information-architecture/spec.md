## MODIFIED Requirements

### Requirement: 旧路由和进度完全兼容
系统 MUST 保留当前 33 个 canonical pages、五个顶层导航入口、`map` 别名以及 `module`、`experiment`、`node`、`section`、`chapter`、`card`、`case`、`paper` 深链参数的可用性；系统 MUST NOT 删除、增加、重命名或重新解释已有 page、内容 ID、进度 ID、存储键及其已保存值。mission 能力 MUST 嵌入现有案例详情和首页/进度页，不得创建新课程、顶层入口或 canonical page。

#### Scenario: 五入口与 33 页面保持稳定
- **WHEN** mission-driven-learning 变更完成
- **THEN** 主导航仍且仅显示首页、学堂、案例、实验室、工具箱五个入口
- **AND** `canonicalPages` 与变更前 33 项逐项一致且没有新增 mission 页面

#### Scenario: 旧顶层直达 URL 继续可用
- **WHEN** 用户打开 `page=videos`、`page=papers`、`page=reviews`、`page=progress`、`page=handbook` 或 `page=co-build` 等不位于主导航的旧 URL
- **THEN** 系统直接渲染原目标内容或无损兼容目标
- **AND** URL 中仍保留可分享和可前进后退的有效页面状态

#### Scenario: 参数化深链继续定位内容
- **WHEN** 用户打开带既有 `case`、`paper`、`experiment`、`module`、`node`、`section`、`chapter` 或 `card` 参数的合法 URL
- **THEN** 系统定位到与变更前相同的内容对象和内部状态
- **AND** `context-window-budget` 与 `rag-chunking` 继续使用既有 `page=strategy-case&case=<id>` 深链而不新增参数

#### Scenario: 已有进度和证据无迁移损失
- **WHEN** 浏览器中存在变更前写入的学习进度、策略证据或资源闭环记录
- **THEN** 首页、进度页、聚合页和案例详情读取相同 ID、存储键与既有值
- **AND** 用户无需清空或手工迁移数据即可继续学习并逐步产生可选 mission 证据

#### Scenario: 未知路由安全回退
- **WHEN** URL 包含未知 page 或失效的可选深链参数
- **THEN** 系统使用既有安全默认页或该页面定义的可用默认内容
- **AND** 页面不得崩溃或显示空白主内容
