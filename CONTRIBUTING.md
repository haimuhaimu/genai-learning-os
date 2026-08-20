# 参与贡献

感谢你帮助改进 GenAI Learning OS。提交代码或内容即表示你同意按本仓库的 Apache License 2.0 提供贡献，并遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 优先贡献：Strategy Case

Strategy Case 从业务目标和产品决策出发，让学习者权衡固定证据、业务代价与反馈闭环，再形成下一轮训练动作。

1. 阅读 [Strategy Case 作者指南](docs/CASE_AUTHORING.md)，确认问题符合七段协议。
2. 复制可类型检查但未注册的 [`examples/strategy-case`](examples/strategy-case/)；实现纯函数 `compute()`、`summarize()` 与测试。
3. 只在 `caseCatalog.ts` 增加案例入口；`CaseId`、route mapping、证据白名单与搜索索引会由 catalog 推导或消费。

不确定是否适合实现时，可先使用 [Strategy Case Issue 表单](.github/ISSUE_TEMPLATE/strategy_case.yml) 说明业务目标、变量、固定数据、代价、反馈和教学边界。

## 贡献参考视频

视频只作为策略摘要之后的可选补充。推荐资源前请阅读 [参考视频贡献与维护指南](docs/VIDEO_CONTRIBUTING.md)，并使用 [参考视频 Issue 表单](.github/ISSUE_TEMPLATE/video_resource.yml) 说明“为什么值得看”和“看完回到哪个决策问题”。

## Bug 与内容贡献

- **Bug**：提供可复现步骤、查询参数深链、预期与实际结果、浏览器信息；视觉问题建议附截图。
- **课程内容**：区分事实、经验规则、教学近似和观点；说明变量、单位、前提、边界与常见误区。
- **既有实验**：可改进默认值、范围、解释、重置、深链和学习进度，但不要让浏览器实验依赖私有服务或密钥。
- **来源**：引用或改编第三方内容时提供来源并确认许可，必要时更新 `THIRD_PARTY_NOTICES.md`。
- **公开边界**：不得加入真实账号数据、私有日志、访问凭据、内部域名或不能公开的数据样例。

## 本地环境

要求 Node.js 20+、pnpm 10+。

```bash
pnpm install
pnpm dev
```

## 分支与提交

1. 从最新 `main` 创建描述清晰的短分支，例如 `content/add-rag-case`。
2. 每个提交只解决一个相对完整的问题；提交信息保持简短、可读。
3. 不提交 `node_modules`、`dist`、日志、缓存、编辑器配置或任何 `.env*` 文件。
4. Pull Request 说明动机、用户可见变化和验证方式；视觉变化附真实页面截图。

## 视觉与可访问性

- 保持清晰的信息层级，避免无意义装饰和大面积空白。
- 使用语义化 HTML；交互元素可键盘访问并提供可见焦点状态。
- 图标不能成为唯一信息载体；不能只用颜色表达状态。
- 检查桌面与 320px 窄屏，避免页面级横向溢出、遮挡或不可点击区域。

## 提交前检查

```bash
pnpm run lint
pnpm run build
pnpm run check:videos
pnpm run typecheck:case-example
node --test
git diff --check
```

Lint 不应出现 error。手动打开受影响的查询参数深链，检查控制台、关键交互与布局。Strategy Case 还必须验证默认值、边界、确定性、有限非负输出和核心教学关系。
