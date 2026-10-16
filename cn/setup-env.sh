#!/usr/bin/env bash
# ============================================================================
#  pilot-cn 环境层（阶段 1）
#
#  把国内网络适配全部写成"配置文件"，不写成环境变量 —— 因为 bench 的后台服务
#  跑在 systemd 用户服务里，读不到 shell 里 export 的值（铁律 2）。
#
#  这一层不安装 Pilot，也不建 bench。它只做 Pilot 做不到的事：
#  换源、配镜像、装中文字体、写 git 改写规则、配代理渗透。
#
#  幂等：可重复执行。已完成的节会自动跳过（--force 可强制重跑）。
#
#  用法：
#    sudo bash cn/setup-env.sh                # 全部执行
#    sudo bash cn/setup-env.sh --only 3       # 只跑第 3 节
#    sudo bash cn/setup-env.sh --revert       # 还原所有改动
# ============================================================================

set -euo pipefail

CN_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/core.sh
source "${CN_SCRIPT_DIR}/lib/core.sh"
# shellcheck source=lib/deps.sh
source "${CN_SCRIPT_DIR}/lib/deps.sh"

CN_STATE_DIR="${CN_STATE_DIR:-/var/lib/pilot-cn}"
CN_DONE_DIR="${CN_STATE_DIR}/done"
CN_LOG_DIR="${CN_STATE_DIR}/log"
CN_STAGE_MARKER="${CN_STATE_DIR}/env-layer.done"

ONLY=""
FORCE=0
REVERT=0
CN_ROUTE="${CN_ROUTE:-}"

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --only)   ONLY="${2:?--only 需要节号}"; shift ;;
      --force)  FORCE=1 ;;
      --revert) REVERT=1 ;;
      -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
      *) die "未知参数：$1" ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# 节状态
# ---------------------------------------------------------------------------
section_done() { [[ -f "${CN_DONE_DIR}/$1" ]]; }
mark_section()  { date -Is > "${CN_DONE_DIR}/$1"; }

run_section() {   # $1=节号 $2=描述 $3=函数名
  local n="$1" desc="$2" fn="$3"
  if [[ -n "$ONLY" && "$ONLY" != "$n" ]]; then return 0; fi
  if [[ "$FORCE" -ne 1 ]] && section_done "$n"; then
    log "第 ${n} 节（${desc}）已完成，跳过（--force 可强制重跑）"
    return 0
  fi
  banner "第 ${n} 节：${desc}"
  "$fn"
  mark_section "$n"
}

# ===========================================================================
# 1. 系统源与基础依赖
# ===========================================================================
setup_apt() {
  log "配置 apt 国内源..."
  local f
  for f in /etc/apt/sources.list.d/ubuntu.sources \
           /etc/apt/sources.list \
           /etc/apt/sources.list.d/debian.sources; do
    [[ -f "$f" ]] || continue
    [[ -f "${f}.pilot-cn.orig" ]] || cp "$f" "${f}.pilot-cn.orig"
    sed -i \
      -e "s|https\?://archive\.ubuntu\.com/ubuntu|${APT_MIRROR}|g" \
      -e "s|https\?://security\.ubuntu\.com/ubuntu|${APT_MIRROR}|g" \
      -e "s|https\?://ports\.ubuntu\.com/ubuntu-ports|${APT_MIRROR_PORTS}|g" \
      -e "s|https\?://deb\.debian\.org/debian|${APT_MIRROR}|g" \
      -e "s|https\?://deb\.debian\.org/debian-security|${APT_MIRROR}|g" \
      "$f"
    log "  已处理 $f（原件备份为 ${f}.pilot-cn.orig）"
  done

  export DEBIAN_FRONTEND=noninteractive
  log "更新 apt 索引..."
  apt-get update -qq || warn "apt-get update 有告警，继续"

  log "安装基础依赖（较慢）..."
  # libmariadb-dev 必须从发行版源装好，再考虑 MariaDB 官方源，
  # 否则同名包会产生版本冲突。
  apt-get install -y -qq \
    git curl wget ca-certificates gnupg lsb-release sudo software-properties-common \
    build-essential pkg-config iproute2 cron \
    libmariadb-dev libssl-dev zlib1g-dev libffi-dev libbz2-dev libreadline-dev \
    libsqlite3-dev liblzma-dev tk-dev libncurses-dev \
    libjpeg-dev libxml2-dev libxslt1-dev \
    python3-dev python3-venv python3-pip python3-setuptools \
    xvfb libfontconfig1 libxrender1 libxext6 libx11-6 \
    || die "基础依赖安装失败"
  ok "基础依赖就绪"
}

# ===========================================================================
# 2. 中文字体与 PDF 引擎
# ===========================================================================
setup_fonts_and_pdf() {
  # 中文字体：不装的话打印出来的中文 PDF 是方块
  log "安装中文字体：${CJK_FONT_PACKAGES[*]}"
  apt-get install -y -qq "${CJK_FONT_PACKAGES[@]}" \
    || warn "中文字体安装失败，打印中文 PDF 可能显示为方块"
  command -v fc-cache >/dev/null 2>&1 && fc-cache -f >/dev/null 2>&1 || true

  # frappe v16 默认用 wkhtmltopdf（pdfkit 路径）；Chromium 只在显式要求时用。
  # 两个都装，覆盖新旧打印功能。
  log "安装 PDF 引擎..."
  apt-get install -y -qq wkhtmltopdf || warn "wkhtmltopdf 安装失败，报表打印可能不可用"
#  apt-get install -y -qq chromium 2>/dev/null \
#    || apt-get install -y -qq chromium-browser 2>/dev/null \
#    || warn "chromium 安装失败（可选，只影响较新的打印功能）"

  local found=()
  command -v wkhtmltopdf >/dev/null 2>&1 && found+=("wkhtmltopdf $(wkhtmltopdf --version 2>&1 | head -1)")
  command -v chromium >/dev/null 2>&1 && found+=("chromium $(chromium --version 2>&1 | head -1)")
  command -v chromium-browser >/dev/null 2>&1 && found+=("chromium-browser")

  if [[ "${#found[@]}" -gt 0 ]]; then
    ok "PDF 引擎就绪：${found[*]}"
  else
    warn "没有任何 PDF 引擎，报表/发票打印会失败（不阻塞安装）"
  fi
}

# ===========================================================================
# 3. Python / uv 镜像
# ===========================================================================
setup_python_mirror() {
  # uv 的配置文件是系统级的，所有用户和 systemd 服务都能读到 —— 这是关键：
  # 环境变量到不了后台任务，配置文件可以。
  log "写入 /etc/uv/uv.toml"
  mkdir -p /etc/uv
  {
    echo "[[index]]"
    echo "url = \"${PIP_INDEX_URL}\""
    echo "default = true"
    if [[ -n "${PYTHON_STANDALONE_BASE:-}" ]]; then
      echo
      echo "# Pilot 用 uv 下载 Python ${PYTHON_VERSION} 时走这里，否则会去 GitHub Releases"
      echo "python-install-mirror = \"${PYTHON_STANDALONE_BASE}\""
    fi
    if [[ -n "${HTTP_PROXY:-}${HTTPS_PROXY:-}" ]]; then
      echo
      echo "# uv 自带 CA，内网自签证书时需要 native-tls"
      echo "native-tls = true"
      [[ -n "${HTTP_PROXY:-}"  ]] && echo "http-proxy = \"${HTTP_PROXY}\""
      [[ -n "${HTTPS_PROXY:-}" ]] && echo "https-proxy = \"${HTTPS_PROXY}\""
      [[ -n "${NO_PROXY:-}"    ]] && echo "no-proxy = \"${NO_PROXY}\""
    fi
  } > /etc/uv/uv.toml
  ok "已写入 /etc/uv/uv.toml"

  log "写入 /etc/pip.conf"
  mkdir -p /etc/pip
  cat > /etc/pip.conf <<EOF
[global]
index-url = ${PIP_INDEX_URL}
trusted-host = ${PIP_TRUSTED_HOST}
EOF
  ok "已写入 /etc/pip.conf"

  # python-build-standalone 的 sysconfig 把编译器记录为 clang，而系统里只有 gcc。
  # 不覆盖会在编译 mysqlclient 这类 C 扩展时报 "No such file or directory: 'clang'"。
  log "写入 /etc/profile.d/pilot-cn.sh"
  cat > /etc/profile.d/pilot-cn.sh <<EOF
# 由 pilot-cn 生成：工具链与国内源
export PIP_INDEX_URL="${PIP_INDEX_URL}"
export PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST}"
export UV_DEFAULT_INDEX="${PIP_INDEX_URL}"
export NPM_CONFIG_REGISTRY="${NPM_REGISTRY}"
export YARN_REGISTRY="${NPM_REGISTRY}"
export CC=gcc
export CXX=g++
EOF
  chmod 0644 /etc/profile.d/pilot-cn.sh
  ok "已写入 /etc/profile.d/pilot-cn.sh"
}

# ===========================================================================
# 4. Node / npm / yarn 镜像
# ===========================================================================
setup_node_mirror() {
  log "配置 npm 全局源：${NPM_REGISTRY}"
  if command -v npm >/dev/null 2>&1; then
    npm config set registry "$NPM_REGISTRY" --global >/dev/null 2>&1 \
      || warn "npm 全局配置失败（Node 可能还没装，安装 Pilot 时会重试）"
  else
    warn "npm 尚未安装，跳过（Pilot 的安装流程会装 Node 后再配）"
  fi

  # 系统级 .npmrc：即使 npm 还没装，先写好，装完立刻生效
  mkdir -p /etc
  printf 'registry=%s\n' "$NPM_REGISTRY" > /etc/npmrc
  ok "已写入 /etc/npmrc"

  log "配置 yarn 源"
  mkdir -p /etc/profile.d
  cat > /etc/yarnrc <<EOF
registry "${NPM_REGISTRY}"
EOF
  if command -v yarn >/dev/null 2>&1; then
    yarn config set registry "$NPM_REGISTRY" --global >/dev/null 2>&1 || true
    yarn config set disturl "$NODE_BINARY_MIRROR" --global >/dev/null 2>&1 || true
  fi
  ok "Node 镜像配置完成"
}

# ===========================================================================
# 5. git 地址改写（三个钉死 GitHub 的依赖）
# ===========================================================================
setup_git_rewrite() {
  if ! command -v git >/dev/null 2>&1; then
    warn "git 尚未安装，跳过（先跑第 1 节）"
    return 0
  fi

  git_rewrite_clear >/dev/null 2>&1 || true
  # 顺序：先做依赖路线（内部会再次 clear 并重建 pinned 依赖规则），
  # 最后应用主仓库镜像 —— 主仓库镜像始终生效，独立于 A/B/C 路线。
  # 不要用 $( ) 捕获：函数内部的 log/warn 也走 stdout，会把路线值污染。
  # 让函数只写文件，再读回来。
  apply_dependency_route >/dev/null
  apply_repo_mirrors

  # 大仓库（frappe 全量历史）经 Gitee 拉取时，HTTP/2 容易中途断流，表现为
  #   RPC failed; curl 92 HTTP/2 stream ... PROTOCOL_ERROR / fatal: early EOF
  # 改走 HTTP/1.1 并调大缓冲与低速容忍，写进 /etc/gitconfig（对所有用户生效）。
  git config --system http.version HTTP/1.1 2>/dev/null \
    || warn "  无法写入 /etc/gitconfig 的 http.version"
  git config --system http.postBuffer 524288000 2>/dev/null || true
  git config --system http.lowSpeedLimit 1000 2>/dev/null || true
  git config --system http.lowSpeedTime 60 2>/dev/null || true
  ok "git 传输参数已优化（HTTP/1.1 + 大缓冲；Gitee 拉大仓库不再中途断流）"

  CN_ROUTE="$(sed -n 's/^CN_FINAL_ROUTE=//p' "${CN_STATE_DIR}/route.env" | tail -1)"
  CN_CHOSEN_PROXY="$(sed -n 's/^CN_CHOSEN_PROXY=//p' "${CN_STATE_DIR}/route.env" | tail -1)"

  case "$CN_ROUTE" in
    A) ok "git 改写完成，路线 A（版本与官方完全一致）" ;;
    B) ok "git 改写完成，路线 B（经代理 ${CN_CHOSEN_PROXY:-}）" ;;
    C) warn "git 改写完成，路线 C —— 版本会偏离 frappe 官方 fork" ;;
  esac
}

# ===========================================================================
# 6. 代理渗透
# ===========================================================================
setup_proxy() {
  if [[ -z "${HTTP_PROXY:-}${HTTPS_PROXY:-}" ]]; then
    log "未配置代理，跳过"
    return 0
  fi

  # systemd 用户服务读 /etc/environment.d，不读 shell 里的 export。
  log "写入 /etc/environment.d/99-pilot-cn-proxy.conf"
  mkdir -p /etc/environment.d
  {
    [[ -n "${HTTP_PROXY:-}"  ]] && echo "http_proxy=${HTTP_PROXY}"
    [[ -n "${HTTPS_PROXY:-}" ]] && echo "https_proxy=${HTTPS_PROXY}"
    [[ -n "${HTTP_PROXY:-}"  ]] && echo "HTTP_PROXY=${HTTP_PROXY}"
    [[ -n "${HTTPS_PROXY:-}" ]] && echo "HTTPS_PROXY=${HTTPS_PROXY}"
    [[ -n "${NO_PROXY:-}"    ]] && echo "no_proxy=${NO_PROXY}"
    [[ -n "${NO_PROXY:-}"    ]] && echo "NO_PROXY=${NO_PROXY}"
  } > /etc/environment.d/99-pilot-cn-proxy.conf
  chmod 0644 /etc/environment.d/99-pilot-cn-proxy.conf

  # 裸 sudo 默认 env_reset，代理变量传不进 apt / certbot / nginx。
  log "授权 sudo 透传代理变量"
  cat > /etc/sudoers.d/pilot-cn-proxy <<'EOF'
Defaults env_keep += "http_proxy https_proxy no_proxy HTTP_PROXY HTTPS_PROXY NO_PROXY"
EOF
  chmod 0440 /etc/sudoers.d/pilot-cn-proxy

  if command -v visudo >/dev/null 2>&1 && ! visudo -cf /etc/sudoers.d/pilot-cn-proxy >/dev/null 2>&1; then
    rm -f /etc/sudoers.d/pilot-cn-proxy
    warn "sudoers 校验失败，已移除该文件（代理不会透传到 sudo 命令）"
  else
    ok "代理已写入 systemd 环境与 sudo 透传名单"
  fi
}

# ===========================================================================
# 7. swap 兜底与时区
# ===========================================================================
setup_swap_timezone() {
  local swap disk
  swap="$(swap_total_mb)"; disk="$(disk_free_gb /)"

  if [[ "$swap" -lt 1024 ]]; then
    if [[ "$disk" -ge 6 ]]; then
      log "交换空间不足 1GB，创建 2GB swapfile"
      if [[ ! -f /swapfile ]]; then
        fallocate -l 2G /swapfile 2>/dev/null \
          || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
        chmod 600 /swapfile
        mkswap /swapfile >/dev/null
        swapon /swapfile
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        ok "已创建并启用 2GB swapfile"
      else
        log "  /swapfile 已存在，跳过"
      fi
    else
      warn "磁盘不足，跳过创建 swapfile（前端构建可能 OOM）"
    fi
  else
    log "交换空间充足（$((swap/1024))GB），跳过"
  fi

  log "设置时区为 ${SITE_TIMEZONE}"
  timedatectl set-timezone "$SITE_TIMEZONE" 2>/dev/null \
    || ln -sf "/usr/share/zoneinfo/${SITE_TIMEZONE}" /etc/localtime
  ok "时区已设置"
}

# ===========================================================================
# 还原
# ===========================================================================
revert_all() {
  banner "还原 pilot-cn 的环境层改动"

  local f
  for f in /etc/apt/sources.list.d/ubuntu.sources \
           /etc/apt/sources.list \
           /etc/apt/sources.list.d/debian.sources; do
    if [[ -f "${f}.pilot-cn.orig" ]]; then
      mv -f "${f}.pilot-cn.orig" "$f"
      log "  已还原 $f"
    fi
  done

  git_rewrite_clear >/dev/null 2>&1 || true
  log "  已清除 git insteadOf 规则"

  rm -rf /etc/uv /etc/pip /etc/npmrc /etc/yarnrc
  rm -f /etc/profile.d/pilot-cn.sh
  rm -f /etc/environment.d/99-pilot-cn-proxy.conf
  rm -f /etc/sudoers.d/pilot-cn-proxy
  log "  已移除 mirror / proxy 配置文件"

  rm -rf "$CN_DONE_DIR" "${CN_STATE_DIR}/route.env" "$CN_STAGE_MARKER"
  ok "环境层已还原（swapfile 与已安装的软件包保留，需要时手工处理）"
}

# ===========================================================================
# 8. 数据库与缓存
# ===========================================================================
setup_database_and_cache() {
  export DEBIAN_FRONTEND=noninteractive

  # --- MariaDB：frappe v16 要求 11.8，发行版自带的是 10.11 ---
  # Pilot 在 Linux 上不自己装数据库（它会直接报错让你跑 install.sh），必须这里装好。
  local repo_file=/etc/apt/sources.list.d/mariadb.list
  local keyring=/usr/share/keyrings/mariadb-keyring.gpg
  if [[ ! -f "$repo_file" ]]; then
    log "配置 MariaDB ${MARIADB_VERSION} 国内源..."
    local key_url got_key=0
    for key_url in "${MARIADB_KEY_URLS[@]}"; do
      if curl -fsSL --max-time 25 "$key_url" -o /tmp/mariadb-release.asc 2>/dev/null \
         && gpg --dearmor < /tmp/mariadb-release.asc > "$keyring" 2>/dev/null; then
        got_key=1
        break
      fi
      warn "  密钥源不可用：$key_url"
    done
    if [[ "$got_key" -eq 1 ]]; then
      echo "deb [signed-by=${keyring}] ${MARIADB_REPO} ${MARIADB_REPO_CODENAME} main" > "$repo_file"
      ok "  MariaDB 源已写入 $repo_file"
    else
      warn "  MariaDB 签名密钥全部获取失败，改用发行版自带的 MariaDB（版本可能不满足 ${MARIADB_VERSION}）"
    fi
  else
    log "MariaDB 源已存在，跳过"
  fi

  apt-get update -qq || warn "apt-get update 有告警，继续"

  # --- redis：Pilot 需要 redis-server，但它自己装不了（要免密 sudo）---
  log "安装数据库与缓存（MariaDB ${MARIADB_VERSION} + Redis）..."
  apt-get install -y -qq mariadb-server mariadb-client redis-server \
    || die "数据库/缓存安装失败"

  ok "MariaDB $(mariadb --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) · Redis $(redis-server --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  warn "运行用户的 systemd 会话（linger）由 install-cn.sh 在建用户时开启"
}

# ===========================================================================
# 主流程
# ===========================================================================
main() {
  parse_args "$@"
  load_config
  detect_arch
  detect_os

  mkdir -p "$CN_STATE_DIR" "$CN_DONE_DIR" "$CN_LOG_DIR"
  chmod 700 "$CN_STATE_DIR"

  if [[ "$REVERT" -eq 1 ]]; then
    revert_all
    return 0
  fi

  require_root
  printf '\n%b\n' "${c_bold}pilot-cn 环境层 —— 把国内适配写进配置文件${c_reset}"

  run_section 1 "系统源与基础依赖"   setup_apt
  run_section 2 "中文字体与 PDF 引擎" setup_fonts_and_pdf
  run_section 3 "Python / uv 镜像"    setup_python_mirror
  run_section 4 "Node / npm 镜像"     setup_node_mirror
  run_section 5 "git 地址改写"        setup_git_rewrite
  run_section 6 "代理渗透"            setup_proxy
  run_section 7 "swap 与时区"         setup_swap_timezone
  run_section 8 "数据库与缓存"          setup_database_and_cache

  date -Is > "$CN_STAGE_MARKER"

  banner "环境层完成"
  printf '  依赖路线：%s\n' "${CN_ROUTE:-未决}"
  printf '  代理：%s\n' "$([[ -n "${HTTP_PROXY:-}${HTTPS_PROXY:-}" ]] && echo 已配置 || echo 未配置)"
  printf '  状态目录：%s\n' "$CN_STATE_DIR"
  printf '\n'
  ok "下一步： sudo bash install-cn.sh"
}

main "$@"
