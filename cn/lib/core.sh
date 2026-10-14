# shellcheck shell=bash
# pilot-cn 共用函数库。由 cn/*.sh 以 source 方式加载，本身不执行任何动作。

# ---------------------------------------------------------------------------
# 输出
# ---------------------------------------------------------------------------
c_reset='\033[0m'; c_red='\033[31m'; c_grn='\033[32m'
c_yel='\033[33m'; c_blu='\033[36m'; c_bold='\033[1m'

log()  { printf '%b\n' "${c_blu}[信息]${c_reset} $*"; }
ok()   { printf '%b\n' "${c_grn}[完成]${c_reset} $*"; }
warn() { printf '%b\n' "${c_yel}[警告]${c_reset} $*"; }
err()  { printf '%b\n' "${c_red}[错误]${c_reset} $*" >&2; }
die()  { err "$*"; exit 1; }
hint() { printf '%b\n' "${c_yel}        → 处理：${c_reset}$*"; }

banner() {
  printf '\n%b\n' "${c_bold}================================================================${c_reset}"
  printf '%b\n'   "${c_bold}  $1${c_reset}"
  printf '%b\n'   "${c_bold}================================================================${c_reset}"
}

# ---------------------------------------------------------------------------
# 仓库路径
# ---------------------------------------------------------------------------
# 本库所在位置往上两层即仓库根（cn/lib/core.sh -> 仓库根）
CN_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CN_ROOT="$(cd "${CN_LIB_DIR}/../.." && pwd)"
CN_CONF_FILE="${CN_CONF_FILE:-${CN_ROOT}/config/mirrors.conf}"
CN_STATE_DIR="${CN_STATE_DIR:-/var/lib/pilot-cn}"
CN_SECRETS_FILE="${CN_SECRETS_FILE:-${CN_STATE_DIR}/secrets.env}"

# ---------------------------------------------------------------------------
# 配置加载。mirrors.conf 里的每一项都必须有默认值，缺项不让脚本停在 set -u 上。
# ---------------------------------------------------------------------------
load_config() {
  [[ -f "$CN_CONF_FILE" ]] || die "找不到配置文件：$CN_CONF_FILE"
  # shellcheck disable=SC1090
  source "$CN_CONF_FILE"

  : "${TARGET_OS:=ubuntu-24.04}"
  : "${ROLE:=server}"
  : "${FRAPPE_BRANCH:=version-16}"
  : "${ERPNEXT_BRANCH:=version-16}"
  : "${PYTHON_VERSION:=3.14}"
  : "${NODE_MAJOR:=24}"
  : "${MARIADB_VERSION:=11.8}"
  : "${APT_MIRROR:=https://mirrors.tuna.tsinghua.edu.cn/ubuntu}"
  : "${APT_MIRROR_PORTS:=https://mirrors.tuna.tsinghua.edu.cn/ubuntu-ports}"
  : "${MARIADB_REPO:=}"
  : "${MARIADB_REPO_CODENAME:=noble}"
  : "${PIP_INDEX_URL:=https://pypi.tuna.tsinghua.edu.cn/simple}"
  : "${PIP_TRUSTED_HOST:=pypi.tuna.tsinghua.edu.cn}"
  : "${PYTHON_STANDALONE_BASE:=}"
  : "${PYTHON_INSTALL_PREFIX:=/opt/python-3.14}"
  : "${NPM_REGISTRY:=https://registry.npmmirror.com}"
  : "${NODE_BINARY_MIRROR:=https://cdn.npmmirror.com/binaries/node}"
  : "${NODE_VERSION:=}"
  : "${YARN_VERSION:=1.22.22}"
  : "${FRAPPE_REPO:=}"
  : "${ERPNEXT_REPO:=}"
  : "${GITEE_OWNER:=}"
  : "${HTTP_PROXY:=}"
  : "${HTTPS_PROXY:=}"
  : "${NO_PROXY:=localhost,127.0.0.1,::1,169.254.169.254,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16}"
  : "${PILOT_REPO_URL:=}"
  : "${PILOT_BRANCH:=main}"
  : "${TLS_MODE:=none}"
  : "${CERT_DIR:=/etc/pilot-cn/certs}"
  : "${RUN_USER:=erpnext}"
  : "${BENCH_NAME:=main}"
  : "${SITE_NAME:=erp.local}"
  : "${DB_MODE:=managed}"
  : "${DB_EXISTING_HOST:=localhost}"
  : "${DB_EXISTING_PORT:=3306}"
  : "${SITE_ADMIN_PASSWORD:=}"
  : "${PILOT_ADMIN_PASSWORD:=}"
  : "${DB_ROOT_PASSWORD:=}"
  : "${TAKEOVER_SYSTEM_SERVICES:=0}"
  : "${USE_PREBUILT_ASSETS:=0}"
  : "${PROBE_TIMEOUT:=25}"
  : "${DOWNLOAD_TIMEOUT:=900}"
  : "${CLONE_TIMEOUT:=600}"

  # 数组缺省：只在未定义时才给默认值。绝不能无条件 `declare -gA NAME=()`，
  # 否则会把 mirrors.conf 里已经定义好的数组整个清空。
  : "${DEFAULT_SITE_APPS:=erpnext}"
  [[ -v EXTRA_APPS ]]            || declare -gA EXTRA_APPS=()
  [[ -v LOCAL_APP_PATHS ]]       || declare -ga LOCAL_APP_PATHS=()
  [[ -v GITHUB_PROXY_CANDIDATES ]] || declare -ga GITHUB_PROXY_CANDIDATES=()
  [[ -v MARIADB_KEY_URLS ]]      || declare -ga MARIADB_KEY_URLS=()
  [[ -v CJK_FONT_PACKAGES ]]     || declare -ga CJK_FONT_PACKAGES=(fonts-noto-cjk fonts-noto-color-emoji)
  [[ -v REPO_MIRRORS ]]          || declare -gA REPO_MIRRORS=()
}

# ---------------------------------------------------------------------------
# 环境探测
# ---------------------------------------------------------------------------
require_root() {
  [[ "${EUID}" -eq 0 ]] || die "请用 root 运行： sudo bash $0"
}

detect_arch() {
  local mach; mach="$(uname -m)"
  case "$mach" in
    x86_64|amd64)  CN_GIT_ARCH="x86_64";  CN_NODE_ARCH="x64"   ;;
    aarch64|arm64) CN_GIT_ARCH="aarch64"; CN_NODE_ARCH="arm64" ;;
    *) die "不支持的架构：$mach（仅支持 x86_64 / aarch64）" ;;
  esac
}

detect_os() {
  CN_OS_ID=""; CN_OS_VERSION=""; CN_OS_CODENAME=""; CN_OS_PRETTY=""
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    CN_OS_ID="$(. /etc/os-release; echo "${ID:-}")"
    CN_OS_VERSION="$(. /etc/os-release; echo "${VERSION_ID:-}")"
    CN_OS_CODENAME="$(. /etc/os-release; echo "${VERSION_CODENAME:-}")"
    CN_OS_PRETTY="$(. /etc/os-release; echo "${PRETTY_NAME:-}")"
  fi
  [[ -n "$CN_OS_CODENAME" ]] || CN_OS_CODENAME="$MARIADB_REPO_CODENAME"
}

run_as_user() {
  if [[ "$RUN_USER" == "root" ]]; then
    bash -lc "$1"
  else
    sudo -u "$RUN_USER" -H bash -lc "$1"
  fi
}

mem_total_mb() { awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo; }
swap_total_mb() { awk '/SwapTotal/{printf "%d", $2/1024}' /proc/meminfo; }
disk_free_gb() { df -Pk "${1:-/}" | awk 'NR==2{printf "%d", $4/1024/1024}'; }

# 生成强随机密码（24 位十六进制）。跨多次运行必须复用，不能每次现生成：
# MariaDB 里已建的账号密码和本次使用的若不一致，建站会 Access denied。
gen_password() {
  local p=""
  if command -v openssl >/dev/null 2>&1; then
    p="$(openssl rand -hex 12)"
  else
    p="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  [[ "${#p}" -ge 16 ]] || return 1
  printf '%s' "$p"
}

# 密码固化：跨多次运行必须一致。断点续跑时，数据库里已建账号的密码和本次使用的
# 若不一致，建站会 Access denied。规则：
#   secrets.env 存在 → 一律以它为准；否则取 mirrors.conf 非空值；仍为空则生成。
# 结果通过全局变量 SITE_ADMIN_PASSWORD / PILOT_ADMIN_PASSWORD / DB_ROOT_PASSWORD 传出。
resolve_passwords() {
  mkdir -p "$CN_STATE_DIR"
  if [[ -f "$CN_SECRETS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CN_SECRETS_FILE"
    log "复用已固化的密码：$CN_SECRETS_FILE"
    return 0
  fi

  local generated=0
  if [[ -z "${SITE_ADMIN_PASSWORD:-}"  ]]; then SITE_ADMIN_PASSWORD="$(gen_password)";  generated=1; fi
  if [[ -z "${PILOT_ADMIN_PASSWORD:-}" ]]; then PILOT_ADMIN_PASSWORD="$(gen_password)"; generated=1; fi
  if [[ -z "${DB_ROOT_PASSWORD:-}"      ]]; then DB_ROOT_PASSWORD="$(gen_password)";      generated=1; fi

  (
    umask 077
    cat > "$CN_SECRETS_FILE" <<EOF
# 由 pilot-cn 自动生成，请勿手工重排格式。
# 断点续跑时以本文件为准；改 mirrors.conf 的密码不再生效。
# 要改密码：删掉本文件后重跑，或直接改本文件（数据库账号密码需同步改）。
SITE_ADMIN_PASSWORD='${SITE_ADMIN_PASSWORD}'
PILOT_ADMIN_PASSWORD='${PILOT_ADMIN_PASSWORD}'
DB_ROOT_PASSWORD='${DB_ROOT_PASSWORD}'
EOF
  ) || die "写入 $CN_SECRETS_FILE 失败"
  chmod 600 "$CN_SECRETS_FILE"

  if [[ "$generated" -eq 1 ]]; then
    log "已生成强随机密码并固化到 $CN_SECRETS_FILE（600）"
  else
    log "已把 mirrors.conf 的密码固化到 $CN_SECRETS_FILE（600）"
  fi
}

# 只展示登录凭据，绝不打印数据库内部密码。
print_login_credentials() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  [[ -n "$ip" ]] || ip="<服务器IP>"

  printf '\n%b\n' "${c_bold}================ 登录凭据 ================${c_reset}"
  printf '  %-22s %s\n' "ERPNext 地址"      "http://${ip}:8000"
  printf '  %-22s %s\n' "ERPNext 账号"      "Administrator"
  printf '  %-22s %s\n' "ERPNext 密码"      "$SITE_ADMIN_PASSWORD"
  printf '  %-22s %s\n' "Pilot 管理面板"   "http://${ip}:7000"
  printf '  %-22s %s\n' "管理面板密码"     "$PILOT_ADMIN_PASSWORD"
  printf '\n  %s\n' "密码也存于 $CN_SECRETS_FILE（600）。数据库密码不在此展示。"
  printf '%b\n' "${c_bold}============================================${c_reset}"
  warn "首次登录后请立即修改 Administrator 密码（用户菜单 → 修改密码）。"
}

# ---------------------------------------------------------------------------
# 网络探测
# ---------------------------------------------------------------------------
# 探测 URL 可达（2xx/3xx 通过）。$2 可用 'HEAD' 走轻量请求。
probe_url() {
  local url="$1" method="${2:-GET}" code=""
  if [[ "$method" == "HEAD" ]]; then
    code=$(curl -fsS -o /dev/null -w '%{http_code}' -I --max-time "${PROBE_TIMEOUT}" -L "$url" 2>/dev/null || true)
  else
    code=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time "${PROBE_TIMEOUT}" -L "$url" 2>/dev/null || true)
  fi
  [[ "$code" =~ ^[23] ]]
}

# 探测 Git 仓库可克隆（比 HTTP 探测准，因为 git 协议走的是另一条路）。
probe_git() {
  local url="$1"
  timeout "${PROBE_TIMEOUT}" git ls-remote --heads "$url" >/dev/null 2>&1
}

# 探测 GitHub 加速代理是否真的能代理 git 协议。
# 只看首页能不能打开是不够的，必须试一次真实的 upload-pack 请求。
probe_git_proxy() {
  local base="$1" code=""
  code=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time "${PROBE_TIMEOUT}" -L \
    "${base}/https://github.com/frappe/pypika.git/info/refs?service=git-upload-pack" 2>/dev/null || true)
  [[ "$code" == "200" ]]
}

# Gitee 公开 API：查某仓库某分支是否存在，返回最近提交信息。
gitee_branch_info() {
  local repo="$1" branch="$2"
  curl -fsS --max-time "${PROBE_TIMEOUT}" \
    "https://gitee.com/api/v5/repos/${repo}/commits?sha=${branch}&per_page=1" 2>/dev/null \
    | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(d[0]["commit"]["committer"]["date"] + " | " + d[0]["commit"]["message"].split("\n")[0])
except Exception:
    print("")' 2>/dev/null || echo ""
}

# Gitee API 只认 "owner/name"，不接受完整 URL。把配置里的仓库地址归一化，
# 避免同一个仓库写两遍（URL 一处、slug 一处）而对不上。
gitee_slug() {
  local u="$1"
  u="${u#https://gitee.com/}"; u="${u#http://gitee.com/}"
  u="${u#git@gitee.com:}";     u="${u%.git}"
  printf '%s' "${u#/}"
}

# ---------------------------------------------------------------------------
# 下载
# ---------------------------------------------------------------------------
fetch() {
  local url="$1" out="$2"
  log "下载：$url"
  curl -fL --retry 3 --retry-delay 3 --connect-timeout 20 \
       --max-time "${DOWNLOAD_TIMEOUT}" -o "$out" "$url" || return 1
  [[ -s "$out" ]] || return 1
}

# ---------------------------------------------------------------------------
# 预检结果的四级分类
#   GREEN  能自动修
#   YELLOW 要用户选
#   RED    修不了但能降级，功能受影响不阻塞
#   BLOCK  修不了且是硬伤，必须停止
# ---------------------------------------------------------------------------
CN_GREEN=0; CN_YELLOW=0; CN_RED=0; CN_BLOCK=0
CN_REPORT=()

_record() {
  local level="$1" name="$2" detail="$3"
  local mark
  case "$level" in
    GREEN)  mark="${c_grn}[可自动修]${c_reset}"; CN_GREEN=$((CN_GREEN+1)) ;;
    YELLOW) mark="${c_yel}[需你选择]${c_reset}"; CN_YELLOW=$((CN_YELLOW+1)) ;;
    RED)    mark="${c_red}[可降级]  ${c_reset}"; CN_RED=$((CN_RED+1)) ;;
    BLOCK)  mark="${c_red}[硬伤]    ${c_reset}"; CN_BLOCK=$((CN_BLOCK+1)) ;;
    OK)     mark="${c_grn}[通过]    ${c_reset}" ;;
  esac
  printf '  %b %-34s %s\n' "$mark" "$name" "$detail"
  CN_REPORT+=("${level}|${name}|${detail}")
}

report_ok()    { _record OK     "$1" "${2:-}"; }
report_green() { _record GREEN  "$1" "$2"; }
report_yellow(){ _record YELLOW "$1" "$2"; }
report_red()   { _record RED    "$1" "$2"; }
report_block() { _record BLOCK  "$1" "$2"; }

report_summary() {
  printf '\n'
  if [[ "$CN_BLOCK" -gt 0 ]]; then
    err "有 $CN_BLOCK 项硬伤，无法继续。请按上面的处理建议修好后重跑预检。"
    return 1
  fi
  if [[ "$CN_RED" -gt 0 || "$CN_YELLOW" -gt 0 ]]; then
    warn "预检通过（可自动修 $CN_GREEN 项，需选择 $CN_YELLOW 项，可降级 $CN_RED 项）"
  else
    ok "预检全部通过"
  fi
  return 0
}

# 导出预检结果供安装脚本读取
write_preflight_result() {
  local out="$1"
  {
    echo "# 由 cn/preflight.sh 生成"
    echo "CN_BLOCK=$CN_BLOCK"
    echo "CN_RED=$CN_RED"
    echo "CN_YELLOW=$CN_YELLOW"
    echo "CN_GREEN=$CN_GREEN"
    for entry in "${CN_REPORT[@]}"; do
      printf 'CN_ITEM=%q\n' "$entry"
    done
  } > "$out"
}
