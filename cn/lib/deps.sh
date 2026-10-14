# shellcheck shell=bash
# pilot-cn 依赖处理库。
#
# 负责两件国内最容易失败的事：
#   1. frappe 钉死在 GitHub 的三个依赖（含两个 pinned SHA 的 fork）
#   2. yarn.lock 里 resolved 字段的绝对 URL（优先级高于 yarn 配置的 registry）
#
# 由 cn/setup-env.sh（写入规则）和安装阶段（改写源码 / lock）共同使用。

CN_REWRITE_KEYS_FILE="${CN_STATE_DIR:-/var/lib/pilot-cn}/git-rewrite-keys.txt"
CN_REWRITE_TESTER="/usr/local/lib/pilot-cn/test-rewrite.sh"

# ---------------------------------------------------------------------------
# git 地址改写
#
# 用 --system（/etc/gitconfig）而不是 --global：Pilot 的 install.sh 会先以 root
# 跑、再以 bench 用户跑，写系统级配置一处覆盖两者，且不要求 bench 用户已存在。
# Pilot 的 git 调用走 pilot/internal/git.py 的 git_env()，它合并 os.environ，
# 所以系统级 insteadOf 对 clone / fetch / reset 全都生效。
# ---------------------------------------------------------------------------
git_rewrite_set() {   # $1=目标URL  $2=被替换的上游前缀
  local target="$1" upstream="$2"
  git config --system --replace-all "url.${target}.insteadOf" "$upstream" \
    || die "写入 git insteadOf 规则失败：$target -> $upstream"
  mkdir -p "$(dirname "$CN_REWRITE_KEYS_FILE")"
  echo "$target" >> "$CN_REWRITE_KEYS_FILE"
}

git_rewrite_clear() {
  [[ -f "$CN_REWRITE_KEYS_FILE" ]] || return 0
  local t
  while read -r t; do
    [[ -n "$t" ]] || continue
    git config --system --unset-all "url.${t}.insteadOf" 2>/dev/null || true
  done < "$CN_REWRITE_KEYS_FILE"
  : > "$CN_REWRITE_KEYS_FILE"
}

# 真实克隆验证：用「上游 URL」克隆（由 insteadOf 生效），并校验目标 commit 是否存在。
# 只看 insteadOf 写没写是不够的 —— 代理站能打开首页不代表能代理 git 协议。
write_rewrite_tester() {
  mkdir -p "$(dirname "$CN_REWRITE_TESTER")"
  cat > "$CN_REWRITE_TESTER" <<'EOS'
#!/usr/bin/env bash
set -uo pipefail
up="$1"; sha="${2:-}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --quiet --no-checkout --filter=blob:none "$up" "$tmp/r" 2>/dev/null \
  || git clone --quiet --no-checkout "$up" "$tmp/r" 2>/dev/null \
  || exit 1
[[ -z "$sha" ]] && exit 0
git -C "$tmp/r" cat-file -e "${sha}^{commit}" 2>/dev/null || exit 2
exit 0
EOS
  chmod 0755 "$CN_REWRITE_TESTER"
}

verify_rewrite() {   # $1=上游URL  $2=sha（可空）
  timeout "${CLONE_TIMEOUT:-600}" "$CN_REWRITE_TESTER" "$1" "${2:-}"
}

# 主仓库镜像：把 github.com 地址改道到 Gitee / 内网 / 本地。
# 与"三个钉死依赖"的路线无关，始终应用。走 git insteadOf，
# 所以 bench.toml 里保持官方 github 地址不动，Pilot 无需感知。
apply_repo_mirrors() {
  local upstream
  for upstream in "${!REPO_MIRRORS[@]}"; do
    [[ -n "${REPO_MIRRORS[$upstream]}" ]] || continue
    git_rewrite_set "${REPO_MIRRORS[$upstream]}" "$upstream"
    log "  主仓库改写：${upstream} -> ${REPO_MIRRORS[$upstream]}"
  done
}

apply_route_a() {
  local owner="$GITEE_OWNER"
  git_rewrite_set "${PYPIKA_REPO:-https://gitee.com/${owner}/pypika}" "$UPSTREAM_PYPIKA"
  git_rewrite_set "${GUNICORN_REPO:-https://gitee.com/${owner}/gunicorn}" "$UPSTREAM_GUNICORN"
  git_rewrite_set "${AIR_DATEPICKER_REPO:-https://gitee.com/${owner}/air-datepicker}" "$UPSTREAM_AIR_DATEPICKER"
}

apply_route_b() {
  git_rewrite_set "${CN_CHOSEN_PROXY}/https://github.com/" "https://github.com/"
}

# 按预检写下的路线应用规则，返回最终生效的路线（写入 stdout）。
apply_dependency_route() {
  local route_file="${CN_STATE_DIR:-/var/lib/pilot-cn}/route.env"
  if [[ -f "$route_file" ]]; then
    # shellcheck disable=SC1090
    source "$route_file"
  fi
  local route="${CN_ROUTE:-C}" chosen="${CN_CHOSEN_PROXY:-}"
  local final=""

  write_rewrite_tester

  if [[ "$route" == "A" && -n "${GITEE_OWNER:-}" ]]; then
    log "验证路线 A（Gitee 自建镜像）..."
    git_rewrite_clear >/dev/null 2>&1 || true
    apply_route_a
    local aok=1
    verify_rewrite "$UPSTREAM_PYPIKA" "$PYPIKA_SHA"        || { aok=0; warn "  pypika 验证失败"; }
    verify_rewrite "$UPSTREAM_GUNICORN" "$GUNICORN_SHA"    || { aok=0; warn "  gunicorn 验证失败"; }
    verify_rewrite "$UPSTREAM_AIR_DATEPICKER" ""           || { aok=0; warn "  air-datepicker 验证失败"; }
    [[ "$aok" -eq 1 ]] && final="A"
  fi

  if [[ -z "$final" && -n "$chosen" ]]; then
    log "验证路线 B（GitHub 加速代理 ${chosen}）..."
    git_rewrite_clear >/dev/null 2>&1 || true
    apply_route_b
    local bok=1
    verify_rewrite "$UPSTREAM_PYPIKA" "$PYPIKA_SHA"        || { bok=0; warn "  pypika 验证失败"; }
    verify_rewrite "$UPSTREAM_GUNICORN" "$GUNICORN_SHA"    || { bok=0; warn "  gunicorn 验证失败"; }
    verify_rewrite "$UPSTREAM_AIR_DATEPICKER" ""           || { bok=0; warn "  air-datepicker 验证失败"; }
    [[ "$bok" -eq 1 ]] && final="B"
  fi

  if [[ -z "$final" ]]; then
    final="C"
    printf '\n'
    warn "=============================================================="
    warn " 降级到路线 C：把依赖改写为官方 PyPI / npm 版本"
    warn " 影响：放弃 frappe 对 pypika / gunicorn / air-datepicker 的 fork 补丁"
    warn " 版本将偏离官方 fork，可能出现行为差异（路线 C 属于最后手段）"
    warn "=============================================================="
    printf '\n'
    git_rewrite_clear >/dev/null 2>&1 || true
  fi

  {
    echo "CN_ROUTE=$final"
    echo "CN_CHOSEN_PROXY=$chosen"
    echo "CN_FINAL_ROUTE=$final"
  } > "$route_file"
  printf '%s' "$final"
}

# ---------------------------------------------------------------------------
# 路线 C：改写源码里的依赖声明
#
# 必须在 bench clone 之前做，因为 bench 是从该目录 git clone 的，
# 未提交的改动会被丢掉（所以下面要 commit）。
# ---------------------------------------------------------------------------
patch_route_c() {
  local app_dir="$1"
  log "  改写 ${app_dir}/pyproject.toml"

  python3 - "$app_dir/pyproject.toml" "$PATCH_PYPIKA_TO" "$PATCH_GUNICORN_TO" <<'EOS'
import re, sys
path, pyk, gun = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
text = re.sub(r'"PyPika @ git\+https://github\.com/frappe/pypika@[0-9a-fA-F]+"', '"%s"' % pyk, text)
text = re.sub(r'"gunicorn @ git\+https://github\.com/frappe/gunicorn@[0-9a-fA-F]+"', '"%s"' % gun, text)
open(path, "w", encoding="utf-8").write(text)
EOS

  if [[ -f "$app_dir/package.json" ]]; then
    log "  改写 ${app_dir}/package.json"
    python3 - "$app_dir/package.json" "$PATCH_AIR_DATEPICKER_TO" <<'EOS'
import json, sys
path, version = sys.argv[1], sys.argv[2]
data = json.load(open(path, encoding="utf-8"))
for section in ("dependencies", "devDependencies"):
    if section in data and "air-datepicker" in data[section]:
        data[section]["air-datepicker"] = version
with open(path, "w", encoding="utf-8") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\n")
EOS
  fi

  # 上游格式一旦变化，静默漏改会让 pip 在几十步之后才去连 github.com 而失败，
  # 所以这里宁可立刻停下。
  local leftover
  leftover="$(grep -c 'git+https://github\.com' "$app_dir/pyproject.toml" 2>/dev/null || true)"
  if [[ "${leftover:-0}" -gt 0 ]]; then
    err "  ${app_dir}/pyproject.toml 仍残留 ${leftover} 处 GitHub git 依赖："
    grep -n 'git+https://github\.com' "$app_dir/pyproject.toml" >&2 || true
    die "路线 C 改写不完整，请修正 patch_route_c 的正则后重试"
  fi

  if [[ -f "$app_dir/package.json" ]] && grep 'air-datepicker' "$app_dir/package.json" 2>/dev/null | grep -q git; then
    die "路线 C 改写不完整：${app_dir}/package.json 的 air-datepicker 仍指向 git"
  fi
  log "  改写校验通过：无残留的 GitHub git 依赖"
}

# bench 是从这些目录 clone 的，所以改动必须提交，否则 clone 时拿不到。
commit_route_c_patch() {
  local app_dir="$1"
  git -C "$app_dir" add -A
  git -C "$app_dir" diff --cached --quiet \
    || git -C "$app_dir" -c user.email=installer@pilot-cn -c user.name='pilot-cn' \
         commit -q -m 'route C: replace git deps with pypi/npm versions'
}

# ---------------------------------------------------------------------------
# yarn.lock 的 resolved 字段是绝对 URL，优先级高于 yarn 配置的 registry。
# 只改 npm 配置而不改 lock 文件，yarn 仍会直奔 registry.yarnpkg.com。
# 必须在 yarn install 之前对每个已克隆的 app 跑一次。
# ---------------------------------------------------------------------------
rewrite_yarn_locks() {
  local bench_dir="$1" registry="$2"
  local locks=() file count=0

  shopt -s nullglob
  locks=("$bench_dir"/apps/*/yarn.lock)
  shopt -u nullglob

  if [[ "${#locks[@]}" -eq 0 ]]; then
    log "  未发现 yarn.lock，跳过 registry 改写"
    return 0
  fi

  for file in "${locks[@]}"; do
    if sed -i \
        -e "s|https://registry\.yarnpkg\.com|${registry}|g" \
        -e "s|https://registry\.npmjs\.org|${registry}|g" \
        "$file" 2>/dev/null; then
      count=$((count + 1))
    else
      warn "  改写失败：$file"
    fi
  done

  log "  已改写 ${count} 个 yarn.lock 的 registry 指向 ${registry}"

  local leftover
  leftover="$(grep -l -E 'yarnpkg\.com|npmjs\.org' "${locks[@]}" 2>/dev/null | wc -l)"
  [[ "${leftover:-0}" -eq 0 ]] \
    || warn "  仍有 ${leftover} 个 yarn.lock 指向公网 registry，yarn install 可能变慢"
}

# 供安装阶段调用：把 app 目录挂进 bench 的 apps/ 并登记到 apps.txt
link_local_app() {
  local bench_dir="$1" app_src="$2" app_name
  app_name="$(basename "$app_src")"

  if [[ -e "${bench_dir}/apps/${app_name}" ]]; then
    log "  本地应用 ${app_name} 已存在，跳过挂载"
    return 0
  fi

  ln -s "$app_src" "${bench_dir}/apps/${app_name}" \
    || die "挂载本地应用失败：${app_src} -> ${bench_dir}/apps/${app_name}"

  local apps_txt="${bench_dir}/sites/apps.txt"
  if [[ -f "$apps_txt" ]] && ! grep -qx "$app_name" "$apps_txt"; then
    echo "$app_name" >> "$apps_txt"
  fi
  log "  已挂载本地应用 ${app_name}（符号链接，改动即时生效）"
}
