# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Wayfinder 标签

`/wayfinder` 另用一套标签，与上面五个 triage 角色互不重叠：

| Label | Meaning |
| ----- | ------- |
| `wayfinder:map` | 一张地图票，正文放 Notes / Decisions-so-far / Fog |
| `wayfinder:research` | 子票：先调研 |
| `wayfinder:prototype` | 子票：做原型验证 |
| `wayfinder:grilling` | 子票：拷问 / 压力测试 |
| `wayfinder:task` | 子票：直接动手做 |

打标签严格按本表取值，不额外强制任何标签。