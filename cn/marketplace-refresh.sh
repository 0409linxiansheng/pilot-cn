#!/usr/bin/env bash
# 刷新 Gitee 上的 marketplace registry：从各应用仓库的 git tag 取最新版本，
# commit 并 push 回 Gitee。首次运行会自动克隆工作副本，之后可重复运行（供定时任务调用）。
#
# 用法:
#   cn/marketplace-refresh.sh [工作副本目录]
#
# 依赖: git、python3、已注册的 Gitee SSH key（Host gitee.com）。
set -euo pipefail

CN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 默认值；可被 config/mirrors.conf 覆盖
MARKETPLACE_REPO_URL="https://gitee.com/linxiansheng0409/marketplace"
MARKETPLACE_DIR="$HOME/pilot-marketplace"
# shellcheck disable=SC1091
[[ -f "$CN_ROOT/config/mirrors.conf" ]] && source "$CN_ROOT/config/mirrors.conf"

MARKETPLACE_DIR="${1:-$MARKETPLACE_DIR}"

log() { printf '\033[36m[marketplace]\033[0m %s\n' "$*"; }

# https://gitee.com/owner/repo(.git) -> git@gitee.com:owner/repo.git
to_ssh_url() {
  local url="${1%.git}"
  if [[ "$url" =~ ^https://([^/]+)/(.+)$ ]]; then
    printf 'git@%s:%s.git' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
  else
    printf '%s' "$url"
  fi
}

REPO_SSH="$(to_ssh_url "$MARKETPLACE_REPO_URL")"

if [[ ! -d "$MARKETPLACE_DIR/.git" ]]; then
  log "克隆工作副本: $REPO_SSH -> $MARKETPLACE_DIR"
  git clone --quiet "$REPO_SSH" "$MARKETPLACE_DIR"
else
  log "同步工作副本: $MARKETPLACE_DIR"
  git -C "$MARKETPLACE_DIR" fetch --quiet origin HEAD
  git -C "$MARKETPLACE_DIR" reset --hard --quiet FETCH_HEAD
fi

log "从 git tag 刷新各应用版本（逐个应用 ls-remote，耗时较长）"
python3 "$CN_ROOT/cn/refresh-marketplace.py" "$MARKETPLACE_DIR"

log "完成"
