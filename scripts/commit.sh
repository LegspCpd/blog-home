#!/usr/bin/env bash
# 统一的提交封装：解决 PowerShell 把 -m 里的引号拆成参数的问题。
# 用法：./scripts/commit.sh <message-file>
set -euo pipefail
git add -A
git commit -F "$1"
git --no-pager log --oneline -1