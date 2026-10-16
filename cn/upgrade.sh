#!/usr/bin/env bash
# cn/upgrade.sh —— 把 vendored 的 Pilot 源码升级到上游新版本，并自动重放 pilot-cn 的改动。
#
# 用法:
#   cn/upgrade.sh --list              # 列出可选的上游 tag
#   cn/upgrade.sh v0.0.65-pre-alpha   # 升级到该上游版本
#
# 原理:
#   pilot-cn 的初始提交 = pristine 上游 v0.0.64。我们对其源码的全部改动记录在
#   cn/patches/pilot-cn-mods.patch。升级 = 用上游新版本替换 pilot/ 与 admin/，
#   再用 `git apply --3way` 重放补丁（3 路合并，能自动吸收上下文漂移）。
#
#   我们自己的层（cn/、config/、install-cn.sh）不受影响。
set -euo pipefail

CN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH="$CN_ROOT/cn/patches/pilot-cn-mods.patch"
UPSTREAM_URL="${PILOT_UPSTREAM_URL:-https://ghfast.top/https://github.com/frappe/pilot}"
DIRS=(pilot admin)
# 补丁的对照基线：pilot-cn 初始提交所对应的上游版本
BASE_REF="v0.0.64-pre-alpha"

log()  { printf '\033[36m[upgrade]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[upgrade]\033[0m %s\n' "$*"; }
die()  { printf '\033[31m[错误]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$CN_ROOT"

git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"

# 确保基线 tag 存在（生成/重生成补丁时要用作对照基线）
if ! git rev-parse -q --verify "refs/tags/upstream-base" >/dev/null 2>&1; then
  log "补上基线 tag upstream-base（= 上游 ${BASE_REF}）"
  git fetch --depth 1 upstream "refs/tags/${BASE_REF}:refs/tags/upstream-base" 2>/dev/null \
    || warn "无法获取基线 tag ${BASE_REF}；重新生成补丁时会缺对照基线"
fi

if [[ "${1:-}" == "--list" ]]; then
  git ls-remote --tags upstream 2>/dev/null \
    | grep -oE 'refs/tags/v[0-9][^ ]*' | sed 's|refs/tags/||' | grep -v '\^{}' | sort -V | tail -12
  exit 0
fi

TARGET="${1:-}"
[[ -n "$TARGET" ]] || die "用法: cn/upgrade.sh <上游 tag>（cn/upgrade.sh --list 看可选）"
[[ -f "$PATCH" ]] || die "找不到补丁 $PATCH"
[[ -z "$(git status --porcelain -- "${DIRS[@]}")" ]] || die "pilot/ 或 admin/ 有未提交改动，请先提交或 stash"

BEFORE="$(git rev-parse HEAD)"
log "升级前 HEAD: ${BEFORE:0:8}   （回滚: git reset --hard ${BEFORE:0:8}）"

LOCAL_TAG="upstream-${TARGET}"
log "拉取上游 ${TARGET} ..."
git fetch --depth 1 upstream "refs/tags/${TARGET}:refs/tags/${LOCAL_TAG}" 2>/dev/null \
  || git fetch --depth 1 upstream "${TARGET}:refs/tags/${LOCAL_TAG}" \
  || die "拉取上游 ${TARGET} 失败"

log "用上游 ${TARGET} 的内容替换 ${DIRS[*]}/"
git checkout "$LOCAL_TAG" -- "${DIRS[@]}" || die "checkout 上游内容失败"

# 删掉"我们加过、上游没有"的文件，否则补丁新建同名文件会失败
git ls-tree -r --name-only HEAD          -- "${DIRS[@]}" | sort > /tmp/_pn_ours.txt
git ls-tree -r --name-only "$LOCAL_TAG"  -- "${DIRS[@]}" | sort > /tmp/_pn_theirs.txt
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  rm -f "$CN_ROOT/$f"
  log "  移除 pilot-cn 独有文件: $f"
done < <(comm -23 /tmp/_pn_ours.txt /tmp/_pn_theirs.txt)

log "重放 pilot-cn 补丁（git apply --3way）..."
if git apply --3way "$PATCH"; then
  log "✅ 补丁干净应用"
else
  warn "⚠️  存在冲突，git apply 已尽力 3 路合并。请处理下列文件："
  git status --short | head -25
  warn "解决冲突后执行: git add -A && git commit"
  exit 2
fi

log "抽查关键改动是否都在："
missing=0
for probe in GiteeProvider LocalProvider remote_ref_sha pilot_sid _switch_to_commit; do
  if git grep -q -- "$probe" -- "${DIRS[@]}"; then
    log "  ✓ $probe"
  else
    warn "  ✗ $probe 丢失（补丁未完全应用）"; missing=1
  fi
done
[[ "$missing" -eq 0 ]] || warn "有改动缺失，请人工检查后再提交"

# ── 重新编译 admin 前端 ────────────────────────────────────────────────
# 前端构建产物（admin/backend/static/*）被 .gitignore 忽略，升级只替换源码，
# 因此补丁里的前端源码改动必须重新编译才能生效。
log "重新编译 admin 前端（前端源码改动需重编译才生效）..."
build_frontend() {
  local rel="$1" label="$2"
  local dir="$CN_ROOT/$rel"
  [[ -f "$dir/package.json" ]] || return 0
  log "  · 编译 $label"
  if ( cd "$dir" \
        && { [[ -d node_modules ]] || npm install --no-audit --no-fund; } \
        && npm run build ) > "/tmp/_pn_build_${label}.log" 2>&1; then
    log "    ✓ $label"
  else
    warn "    ✗ $label 编译失败，日志: /tmp/_pn_build_${label}.log"
    warn "      手动执行: cd $rel && npm install && npm run build"
  fi
}
build_frontend admin/frontend/dashboard    dashboard
build_frontend admin/frontend/editor       editor
build_frontend admin/frontend/in-app-embed in-app-embed

log "完成。检查无误后提交："
log "  git diff --stat"
log "  git add -A && git commit -m 'chore: upgrade vendored pilot to ${TARGET}'"
