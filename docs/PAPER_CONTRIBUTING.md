# 论文讲解库贡献指南

论文讲解库把核心论文转成可学习的机制卡，而不是只维护标题与链接。每篇内容都要回答：论文修复了什么失败、关键机制如何工作、产品落地要看什么代价，以及学习者能带回课程验证什么。

## 收录标准

仅收录同时满足以下条件的论文：

1. 原论文有稳定的 `https://arxiv.org` 或其子域入口；
2. 对推荐系统、Transformer / LLM、扩散 / 多模态、Agent / Harness、自我改进 / 世界模型至少一个方向有代表性；
3. 能用非算法学习者可理解的中文解释问题、机制和产品取舍；
4. 能关联到现有 Strategy Case 或学习路线；
5. 能提出一个可以通过复述、对照实验或指标设计回答的阅读问题。

不收录只有二手解读、缺少原论文入口、文案只复述摘要、无法说明工程边界或无法映射课程的条目。

## Catalog schema

论文维护在 `src/resources/paperCatalog.ts`：

```ts
type PaperResource = {
  id: string
  title: string
  authors: string
  year: number
  area: '推荐系统' | 'Transformer / LLM' | '扩散 / 多模态' | 'Agent / Harness' | '自我改进 / 世界模型'
  level: '入门' | '进阶'
  kind: '奠基论文' | '方法论文' | '系统论文' | '评估基准'
  url: string
  relatedCaseIds: CaseId[]
  relatedRouteIds: RouteId[]
  oneLine: string
  problem: string
  mechanism: string
  productLens: string
  readQuestion: string
  readingMinutes: number
}
```

`id` 使用 kebab-case；`url` 必须为 HTTPS arXiv 原论文入口；年份为 2010–2030 的整数；`readingMinutes` 为 10–180 的整数。至少关联一个现有 case 或 route。所有讲解字段必须非空，且 `id` 与 URL 均不可重复。

## 写作模板

- **30 秒看懂**：`oneLine` 用一句话说清贡献；`problem` 说明此前哪类失败没有解决。
- **关键机制**：`mechanism` 解释信息怎样流动、组件如何配合以及为什么有效，避免只堆术语。
- **产品视角**：`productLens` 写出质量、成本、延迟、风险、数据偏差或适用边界中的至少一项。
- **带回课程的问题**：`readQuestion` 必须能被复述、实验、指标或断言验证，避免“你有什么感想”。

`readingMinutes` 是建议精读时间，不是论文官方时长。难度按理解核心机制所需先修划分，而不是按页数划分。

## 搜索与页面要求

新增条目会自动进入全局搜索。标题、作者、方向、`oneLine`、`problem`、`mechanism`、`productLens` 与 `readQuestion` 都必须可检索，结果统一跳转 `?page=papers`。论文页只使用带 `noopener noreferrer` 的新窗口外链，不嵌入第三方页面。

## 校验

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

`paperCatalog.test.mjs` 会检查数量、代表作、方向覆盖、唯一 ID、HTTPS、arXiv 域名、年份、阅读时长、枚举、必填讲解和 case / route 引用。`route-index.test.mjs` 会检查页面路由和每篇论文的搜索字段。

## 提交前检查

- [ ] 标题、作者、年份与 arXiv 页面一致；
- [ ] URL 是稳定的 arXiv 原论文入口；
- [ ] 中文讲解没有夸大论文结论；
- [ ] 产品视角明确写出取舍或边界；
- [ ] 阅读问题可以被验证；
- [ ] case / route 关联真实且克制；
- [ ] 页面筛选和移动端卡片仍可正常阅读。
