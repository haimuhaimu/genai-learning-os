# 最小 Strategy Case 示例

[`exampleCase.ts`](exampleCase.ts) 使用仓库真实的 `defineStrategyCase`、`StrategyCaseSpec` 输入结构与证据输出类型。它**故意不导入 `caseCatalog.ts`**，因此可以通过类型检查，但不会出现在产品页面、搜索或证据白名单中。

验证：

```bash
pnpm run typecheck:case-example
```

贡献真实案例时，把文件复制到 `src/components/strategy/`，替换业务问题与固定数据，补充 Node 测试，再按 [作者指南](../../docs/CASE_AUTHORING.md) 将 spec 注册到 catalog。
