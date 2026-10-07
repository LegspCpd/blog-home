# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout: single-context

**这个仓库是 single-context**：全仓库共用根目录一份 `CONTEXT.md`，架构决定放根目录的 `docs/adr/`。

初始化时确认过：仓库没有 `pnpm-workspace.yaml`、`package.json` 没有 `workspaces` 字段、没有 `packages/*`
多包结构 —— 没有 monorepo 信号，因此不采用 multi-context，也不需要 `CONTEXT-MAP.md`。

预期结构：

```
/
├── CONTEXT.md          ← 全仓库唯一一份词汇表
├── docs/
│   ├── adr/            ← 架构决定
│   └── agents/         ← 本目录：issue tracker / triage 标签 / 域文档约定
└── src/
```

**本次初始化不创建 `CONTEXT.md`，也不创建 `CONTEXT-MAP.md`，更不创建任何 `src/<子项目>/CONTEXT.md`。**
留到第一次真正写下词条时（`/domain-modeling` 走到那一步）再建 —— 没有词条时先建一个空壳文件没有意义。

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/adr/`** — read ADRs that touch the area you're about to work in

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_