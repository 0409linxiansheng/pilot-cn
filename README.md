# Pilot 国内版（pilot-cn）

> 让 ERPNext 在国内网络环境下**装得上、用得住、能持续升级**。

> **文档状态**：设计说明 + 实现现状。✅ 已实现，🔧 待实现。日常升级/部署命令见「十二、日常维护」。

---

## 一、这是什么

**Pilot 是 Frappe 官方指定的下一代 bench。** `frappe/bench` 的 README 里原文写着：

> "We are working on a new simplified bench. Check it out at https://github.com/frappe/bench-cli"

而 `frappe/bench-cli` 已经改名为 `frappe/pilot`（其 `pyproject.toml` 里 `name = "pilot"`，入口 `pilot = "pilot.cli:main"`）。

所以 Pilot 不是社区旁支，**它是官方主线**。它负责：建 bench、建站点、装应用、跑开发环境、部署生产、备份、升级、回滚，还带一个网页管理界面。

**它的问题不在功能，在于它是给"网络畅通"的环境写的。** 国内的网络环境会让它的安装和升级反复失败。

**Pilot 国内版要做的事**：把 Pilot 原封不动地拿过来，**只在它外面加一层"国内网络适配"**，让它在国内能顺畅工作，同时**不破坏它持续升级的能力**。

---

## 二、四条铁律

这四条是整个项目的设计底线。任何改动如果违反其中一条，方案就要推翻重来。

### 铁律 1：绝不修改 `frappe` 和 `erpnext` 的代码

**原因**：Pilot 升级应用时执行的是强制覆盖（`git reset --hard origin/<分支>`）。你在应用代码里做的任何修改，升级时会被**静默清除**；如果改动涉及数据库结构，升级会直接失败，从此再也升不上去。

**怎么判断哪些会被覆盖**——记住这一条就够了：

| 目录 | 升级时 |
|---|---|
| `apps/` 里（frappe、erpnext 的**代码**） | ❌ 全部被覆盖 |
| `sites/` 里（站点**配置**） | ✅ 保留 |
| `config/` 里（工作台配置） | ✅ 保留 |
| 系统里装的软件（字体等） | ✅ 保留 |

**一句话：代码会被覆盖，配置会保留。** 所以所有国内适配都写在配置里，不写进代码。

### 铁律 2：环境层用配置文件，不用环境变量

**原因**：bench 的后台服务和网页管理界面的后台任务，都跑在 systemd 用户服务里。**你在命令行里设置的环境变量，这些后台服务读不到。**

所以镜像源、代理这些配置，必须写成**文件**（`/etc/uv/uv.toml`、`/etc/npmrc`、`/etc/gitconfig` 等），而不是 `export`。

### 铁律 3：对 Pilot 的修改必须提交到自己的代码仓库，不能直接在服务器上手改

**原因**：Pilot 升级自己的时候会执行 `git pull`。你在服务器上手动改的文件，要么产生冲突，要么被覆盖。

### 铁律 4：所有外部地址收敛到一处配置

**原因**：Pilot 官方迭代很快（40 多个活跃开发分支）。如果外部地址散落在各个文件里，官方一更新，维护成本就会爆炸。所有地址必须集中在一个配置文件里。

---

## 三、国内网络到底卡在哪（7 个出口）

ERPNext 安装过程要访问 7 类外部资源，分属不同的包管理器。**每一个都要单独处理。**

| # | 环节 | 官方默认源 | 国内状况 | 国内版用什么 |
|---|---|---|---|---|
| 1 | 系统软件包（apt） | archive.ubuntu.com | 慢 | 清华 / 阿里云镜像 |
| 2 | Python 包（pip / uv） | pypi.org | 慢 | 清华镜像 |
| 3 | 前端包（npm / yarn） | registry.npmjs.org | 慢 | npmmirror |
| 4 | Node.js 二进制 | nodejs.org | 慢 | npmmirror 二进制源 |
| 5 | MariaDB 源 | deb.mariadb.org | 慢 | 清华镜像 |
| 6 | Python 3.14 运行时 | GitHub Releases | **经常不通** | 南京大学 github-release 镜像 |
| 7 | **frappe / erpnext 源码** | github.com | **经常不通** | **Gitee 镜像仓库** |

### 除了这 7 个，还有一批"没有镜像可用"的

这些不是包源，是 GitHub 上的裸文件下载，**没有国内镜像，只能靠代理或改写**：

| 内容 | 出现在哪 | 影响 |
|---|---|---|
| frappe 钉死在 GitHub 的 3 个依赖 | `pyproject.toml` / `package.json` | **阻塞安装**（必须解决） |
| 预构建前端资源 | Pilot 下载加速用 | 失败会自动回退本地编译，**不阻塞**，只是慢 |
| Pilot 自己的升级包 | Pilot 升级自己时 | **可用 `--dev` 模式绕过**（改成 `git pull`） |
| WAF 安全规则包 | 可选功能 | 不影响核心 |
| 应用市场列表 | 网页界面用 | 不影响核心 |
| 公网 IP 探测 | 配域名时用 | 会误报"域名没指过来" |

### 三个钉死 GitHub 的依赖（最硬的一块）

frappe v16 的依赖里，有 3 个直接指向 GitHub，**且国内没有现成镜像**：

| 依赖 | 问题 |
|---|---|
| `PyPika @ git+github.com/frappe/pypika@<SHA>` | Gitee 无对应镜像 |
| `gunicorn @ git+github.com/frappe/gunicorn@<SHA>` | Gitee 有上游镜像，但**不含 frappe fork 的那个 commit** |
| `air-datepicker: git+github.com/frappe/air-datepicker` | 同上 |

> ⚠️ 关键陷阱：后两个是**钉死在具体 commit SHA 的 fork**。所以"把镜像地址换个域名"这种粗暴做法会失败——Gitee 的 `mirrors/*` 镜的是上游仓库，SHA 对不上，git 会直接报找不到对象。

**解决方案：三路线自动降级**（来自已验证的实测脚本）

| 路线 | 做法 | 优劣 |
|---|---|---|
| **A** | Gitee 服务端「从 GitHub 导入仓库」 | ✅ 最精确，保留 fork 与 pinned SHA<br>✅ **是 Gitee 的服务器去 GitHub 拉代码，不需要你能访问 GitHub** |
| **B** | GitHub 加速代理 | ⚠️ 依赖第三方代理站，存活率不稳定 |
| **C** | 改写依赖为 PyPI / npm 官方版本 | ⚠️ 保底能装，但**丢掉 frappe 的 fork 补丁**，版本偏离官方 |

---

## 四、三层架构

核心思路：**把国内适配全部推到应用代码之外。**

```
┌─ 第 0 层：环境层（配置文件 + 系统软件）──────────────┐
│  /etc/uv/uv.toml         PyPI 镜像 + Python 运行时镜像 │
│  /etc/npmrc              npm 镜像                      │
│  /etc/gitconfig          git 地址改写（三路线）         │
│  ~/.config/environment.d 代理（让后台服务也能读到）     │
│  /etc/sudoers.d/         代理穿透 sudo                 │
│  系统字体                 中文字体（否则 PDF 是方块）    │
│                                                        │
│  ← 永不碰应用代码，永久有效，任何升级都不影响           │
├─ 第 1 层：Pilot 层（我们的 fork，补丁尽量少）──────────┤
│  · 外部地址收敛到一处配置（铁律 4）                     │
│  · pilot doctor 预检                                   │
│  · 多渠道 Git 支持（Gitee / 本地 / 任意）               │
│  · 证书目录可配置                                       │
│  · --no-takeover（不接管已有的 MariaDB/Redis/nginx）    │
│                                                        │
│  ← 用 --dev 方式安装，升级走 git pull，不会被覆盖        │
├─ 第 2 层：frappe / erpnext ──────────────────────────┤
│  ⛔ 一行不改。用官方发布版本。                          │
│  升级、备份、回滚全部由 Pilot 的迁移链负责。             │
└────────────────────────────────────────────────────────┘
```

**关键点：第 0 层的配置对两条路线都有效。** 无论你最终用 bench 还是用 Pilot，环境层只做一次。

---

## 五、工作流程

### 五位一体的流程设计

```
【第 0 步】从 Gitee 拉取（一条命令）
              ↓
【第 1 步】自动预检
              输出：🟢可自动修 / 🟡要你选 / 🔴能降级 / ⛔硬伤
              ↓
【第 2 步】自动配源 + 问你要选的那几项
              ↓
【第 3 步】重新预检
              没有 ⛔ → 继续
              有 ⛔ → 告诉你怎么处理，停止
              ↓
【第 4 步】安装 Pilot（从内网/Gitee，dev 模式）
              ↓
【第 5 步】安装 Frappe + ERPNext
              ⚠️ 不改它们的代码，只写配置文件
              ↓
【第 6 步】在 Pilot 网页里：看预检结果 / 改源 / 换版本再预检
              ↓
【第 7 步】日常：每次升级前再预检一次
```

### 主入口放在 Gitee，不放 GitHub

**原因很直接：GitHub 本身就是国内不稳定的源头之一。** 如果用户的第一个动作是"从 GitHub 拉脚本"，那脚本再好也没用——第一步就卡住了。

所以：**Gitee 作为主入口，GitHub 放一份作为备份。** 而且引导脚本要**自包含**，从 Gitee 仓库里拉自己需要的一切，不再依赖 GitHub。

用户只需要一条命令：

```bash
curl -fsSL https://gitee.com/<你的账号>/pilot-cn/raw/master/install-cn.sh | bash
```

---

## 六、预检（`pilot doctor`）

这是整个项目最有价值的功能，也是本项目的起点。

### 为什么需要它

现在的痛点不是"装不上"，而是**"装到一半失败，不知道哪里错了"**。7 个外网出口分散在 30 分钟的安装过程里，每步的报错都很难懂。

预检把这件事变成：**开跑前 10 秒，给你一张链路健康表 + 每一处的处理办法。**

### 结果分四类

| 类型 | 例子 | 脚本怎么办 |
|---|---|---|
| 🟢 **能自动修** | Python 源、npm 源、字体、git 改写 | 直接改掉，不打扰用户 |
| 🟡 **要你选** | 要不要走代理、装不装 Chromium | 弹问题让你选 |
| 🔴 **修不了，但能降级** | 预构建资源下不动 | 明确告知"会慢一点，**功能不受影响**"，是否继续 |
| ⛔ **修不了，且是硬伤** | 网络完全不通 | 停止，告诉你怎么处理 |

> **"通过"的标准是：没有 ⛔ 项。** 🔴 项允许带警告继续。否则用户会被一堆无害的警告吓得不敢往下走。

### 输出样例

```
$ pilot doctor

链路健康检查
────────────────────────────────────────────────────────────
[✓] git → 源码仓库              312ms   经 insteadOf 改写
[✓] PyPI 索引 (清华)             89ms
[✓] npm registry (npmmirror)    120ms
[✓] Python 3.14 运行时 (南大)    210ms
[✓] Node 24 二进制 (npmmirror)   95ms
[✗] GitHub Releases             超时    → 预构建资源不可用
                                        降级：回退本地编译，功能可用
[!] 中文字体                     缺失    → 修复：apt install fonts-noto-cjk
[!] 公网 IP 探测                 失败    → 配域名时会误报，需换探测端点

7/8 通过 · 1 个降级项 · 1 个待修
```

### 预检出现三次，共用一套检查逻辑

装 Pilot 之前网页还不存在，所以必须做三套外壳：

| 什么时候 | 用什么 | 优先级 |
|---|---|---|
| 装 Pilot **之前** | 独立命令行脚本 | 🔧 P1 |
| 装 Pilot **之后** | `pilot doctor` 命令 | 🔧 P1 |
| 装好之后（可选） | Pilot 网页里加一页 | 🔧 P3（工作量最大，价值最低） |

---

## 七、多渠道 Git 支持

用户可以选择从**任何渠道**拉源码和应用，不再局限于 GitHub。

| 渠道 | 支持方式 |
|---|---|
| **Gitee** | 原生支持（含 API：列分支、查默认分支、读文件、私有仓库 token） |
| **GitLab / 内网 Gitea** | 通用兜底（纯 git 命令） |
| **任意 Git 服务器** | 通用兜底 |
| **本地目录** | 原生支持（`/path/to/repo` 或 `file:///path/to/repo`） |
| GitHub | 原生支持（保持现状） |

### 现状说明（已核实的代码事实）

Pilot 的 git 模块**第一行就写着设计目标**：

```python
# pilot/integrations/git/__init__.py:1
"""Provider-agnostic Git integration for private app repositories."""
```

而且装应用本来就是普通的 `git clone`，所以：

| 能力 | 现状 |
|---|---|
| 命令行 `pilot get-app <任意 git 地址>` | ✅ **应该已经能用**（待实测确认） |
| 从 Gitee 安装应用 | ✅ 同上 |
| 从本地目录安装 | ✅ 同上 |
| 切换分支 / 升级 | ✅ 纯 git 操作，任意渠道可用 |
| 预构建资源加速 | ⚠️ 非 GitHub 时自动降级为本地编译 |
| **网页界面里粘贴地址、自动识别应用名** | ❌ **目前只支持 GitHub**（硬编码 bug） |
| 网页界面的仓库/分支选择器 | ❌ 只支持 GitHub |

### 要补的工作

| 优先级 | 做什么 | 说明 |
|---|---|---|
| **P0** | 实测命令行从 Gitee 装应用 | 零成本，可能今天就能用 |
| P1 | 注册 `GiteeProvider` | 让网页界面也支持 Gitee |
| P2 | 修 `resolve_app_name_from_repo` 的硬编码 | 让任意渠道都能自动识别应用名 |
| P3 | 应用市场（marketplace）可替换 | 支持自建应用市场 |

> 方向说明：这个改动**和 Pilot 自己的架构设计是一致的**（文件开头那句 "Provider-agnostic"），官方本来就想这么做，只是还没做完。**我们做的是把它补完，不是改它的设计。**

---

## 八、让"开发"和"生产"一体

### 官方立场：开发和生产是两种形态

Frappe 生态里，"开发环境"和"生产环境"在传统上是**互斥**的：

- 开发需要热重载、未压缩资源、开发者模式
- 生产需要 nginx + 进程守护 + 压缩资源 + HTTPS

**没有任何工具能把两者塞进同一个实例**（Pilot 不行，Docker 官方也明确说 "Development, testing, and production are separate workflows"）。

### Pilot 提供的"一体"方案：共享基础设施，隔离运行实例

```
服务器
├── MariaDB / PostgreSQL     ← 跨 bench 共享（配置在 common_config.toml）
├── bench: dev               ← 开发实例
│   ├── Redis 13000/11000
│   ├── pilot -b dev start   → :8000，热重载全开
│   └── 站点：dev.localhost
└── bench: prod              ← 生产实例
    ├── Redis 13100/11100
    ├── systemd + nginx + HTTPS
    └── 站点：erp.example.com
```

- **共享数据库服务**，各自独立的站点目录、Redis 端口、nginx 虚拟主机
- 代码流：dev 上开发 → 推送到 Git → prod 上更新 + 迁移
- 一个网页管理界面可以同时管这两个 bench

### 三个层次的"一体"，Pilot 的支持程度

| 层次 | 支持吗 |
|---|---|
| 同一台机器上同时有开发和生产环境 | ✅ 完全支持，而且是 Pilot 的设计核心 |
| 同一个 bench 既跑生产、又能做定制开发 | ✅ 支持（可开站点级开发者模式）<br>⚠️ 但生产 bench **不装应用的 dev 依赖** |
| 同一个 bench 既是 `pilot start` 开发服务器又是生产服务 | ❌ 不支持（两者都要占用同一个 web 端口） |

---

## 九、升级与回滚

这是 Pilot 相对于"自己写脚本部署"最大的优势，**必须保留**。

### 升级 Pilot 自己

```bash
pilot admin upgrade
```

因为用 `--dev` 方式安装，这一步实际执行的是 `git pull`——**走我们已经配好的 git 改写规则，绕开了 GitHub API 这条死路。**

### 升级应用（Frappe / ERPNext）

Pilot 的迁移链会自动执行：

```
查更新 → 备份 → 拉代码 + 装依赖 + 构建资源 → 数据库迁移 → 重启服务
                          ↓ 失败
                  自动回滚应用代码
                          ↓ 迁移失败
                  自动回滚站点数据
```

**这条链的"备份 + 双向回滚"是自己写脚本最难做对的部分**，也是最不该自己重写的地方。

---

## 十、和官方 Pilot 的差异（改动清单）

我们的目标是**把改动压到最小**，这样官方更新时维护成本才低。全部源码改动集中在 `cn/patches/pilot-cn-mods.patch`（14 个文件），升级时由 `cn/upgrade.sh` 自动重放。

### 已实现

| # | 改动 | 涉及文件 |
|---|---|---|
| 1 | 多渠道 Git 支持（Gitee / 本地目录 / 任意 Git 服务器） | `pilot/integrations/git/` |
| 2 | 应用仓库自动识别应用名（去掉 GitHub 硬编码） | `pilot/core/app/repository.py`、`pilot/internal/git.py` |
| 3 | 应用市场 registry 指向 Gitee（可用环境变量覆盖） | `pilot/core/registry_cache.py` |
| 4 | **中文界面**：运行时注入，不改前端源码；后端每次请求重读词表，改翻译**不用重启** | `admin/backend/app.py` + `cn/i18n/pilot-zh.js`（1056 条） |
| 5 | **进程崩溃不拖垮整个 bench**：只有 redis / admin 是致命进程，web / worker / scheduler / socketio 崩了只自动重启自身 | `pilot/managers/processes/local.py` |
| 6 | **导入应用自动装到唯一站点**：单站点 bench 下不再"只下载不安装" | `admin/backend/api/v1/apps.py` |
| 7 | 市场页自动选中唯一站点 | `admin/frontend/dashboard/src/composables/apps/useMarketplace.ts` |
| 8 | 隐藏 Cloud Settings（自建环境用不到 Frappe Cloud） | `admin/backend/api/v1/auth.py`、`middleware.py` |
| 9 | **上游升级机制**：补丁 + 重放脚本 + 升级后自动重编译前端 | `cn/upgrade.sh`、`cn/patches/` |
| 10 | 部署脚本：源码 → 运行实例一键同步（含前端产物） | `cn/deploy.sh` |

### 未实现（🔧）

| # | 改动 | 现状 |
|---|---|---|
| 1 | `pilot doctor` 预检子命令 | 已有独立脚本 `cn/preflight.sh`，未接进 CLI |
| 2 | 证书目录可配置（`cert_dir`） | 未做。国内用云厂商证书，目前仍走 Let's Encrypt 路径 |
| 3 | `--no-takeover`（不接管机器上已有的 MariaDB / Redis / nginx） | 未做 |
| 4 | 公网 IP 探测端点可配置 | 未做（仍用 `8.8.8.8`，国内不通会误报域名） |
| 5 | S3 备份增加国内厂商 | 未做 |
| 6 | `install.sh` 国产系统适配（麒麟 / 统信 / openEuler） | 未做（目前只验证过 Ubuntu 24.04） |
| 7 | 网页里加预检页 | 未做 |

### 明确不做的事

| 不做 | 原因 |
|---|---|
| ❌ 改 `frappe` / `erpnext` 代码 | 会毁掉持续升级能力（铁律 1） |
| ❌ 把 Pilot 塞进 Docker 容器 | Pilot 是宿主机编排器，两套编排会抢地盘 |
| ❌ 重写升级 / 迁移链 | 现有的备份 + 回滚设计扎实，重写风险极高 |
| ⏸ 国密 SM2 证书 | 需要另起一套 CA，独立课题 |
| ⏸ 全离线安装包 | 独立课题，可作为后续阶段 |

---

## 十一、已知限制

1. **系统要求**：Pilot 只支持 **Ubuntu 24.04+ / Debian 12+**。这是硬性要求，选错系统全盘重来。
2. **不在官方文档里**：frappe v16 / erpnext v16 的 README 目前还没有提到 Pilot，官方安装文档仍指向 Docker 和 bench。Pilot 是 bench 官方指定的继任者，但尚未接管 erpnext 的安装文档。
3. **要跟着官方更新**：我们的 fork 需要定期从官方同步，否则会逐渐过时。
4. **第三方代理不稳定**：git 改写路线 B 依赖公共加速代理站，存活率不稳定；建议自建或使用路线 A。
5. **源码镜像不同步**：Gitee 镜像仓库不会自动跟随上游更新，需要手动同步。
6. **wkhtmltopdf 版本**：apt 版不是 patched-qt 构建，复杂打印格式可能异常。Pilot 打印中文 PDF 需要系统装中文字体。
7. **域名备案**：国内服务器使用域名对外提供服务必须备案，否则 80 端口被拦，自动申请 HTTPS 证书必然失败——这也是为什么要把证书目录做成可配置。

---

## 十二、日常维护

三条命令覆盖日常操作，都在仓库根目录执行。

### 部署：源码 → 运行实例

```bash
sudo cn/deploy.sh              # 同步源码 + 前端构建产物
sudo cn/deploy.sh --restart    # 同步后重启 bench
```

前端产物 `admin/backend/static/*` 被 `.gitignore` 忽略，必须单独同步，否则界面还是旧的。`deploy.sh` 用 `rsync` 同步，并对已部署的静态文件加 `P`（protect）保护，避免 `--delete` 误删。

### 升级：跟随上游

```bash
cn/upgrade.sh --list              # 列出可选的上游 tag
cn/upgrade.sh v0.0.65-pre-alpha   # 升级到该版本
```

升级流水线：拉上游 tag → 用上游内容替换 `pilot/` `admin/` → 删掉"我们加过、上游没有"的文件 → `git apply --3way` 重放补丁 → **重新编译三个前端**（dashboard / editor / in-app-embed）→ 抽查关键改动（`GiteeProvider`、`LocalProvider`、`remote_ref_sha`、`pilot_sid` 等）。

我们的层（`cn/`、`config/`、`install-cn.sh`）不在 `pilot/` `admin/` 里，升级不会碰。

### 维护流程

```
frappe/pilot（官方）
        │  定期同步（建议每月一次）
        ▼
我们的 fork（只含最小改动）
        │  cn/upgrade.sh 升级 + cn/deploy.sh 部署
        ▼
生产服务器
```

**关键约束**：改动越少越好。目前全部源码改动 = 14 个文件，清单见 `cn/patches/pilot-cn-mods.patch`。

---

## 十三、待定问题（需要拍板）

| # | 问题 | 选项 |
|---|---|---|
| 1 | 目标操作系统 | Ubuntu 24.04 / 国产系统（麒麟、统信、openEuler）？ |
| 2 | 数据库归属 | 用 Pilot 自带的隔离实例，还是接入机器上已有的 MariaDB？（已核实 Pilot 支持 `existing` 配置项接入现成数据库） |
| 3 | 路线选择 | 只用 Pilot？还是保留现有 bench 脚本作为一条并行路线？ |
| 4 | 第三方代理 | 用公共加速站，还是自建缓存反代？ |
| 5 | 应用市场 | 用官方 GitHub 市场，还是自建 Gitee 版？ |
| 6 | 离线安装包 | 现在做，还是后续再说？ |
| 7 | 维护人 | 谁负责定期同步官方更新？ |

---

## 十四、附：从零开始的完整步骤

### 前置条件

- 一台服务器：**Ubuntu 24.04**，建议 **4 核 8G**，硬盘 60G 以上
- root 权限
- 云控制台安全组放行 80、443、22

### 第 0 步：连接服务器

```bash
ssh root@<你的服务器IP>
```

### 第 1 步：预检（零风险，不修改任何东西）

```bash
curl -fsSL https://gitee.com/<账号>/pilot-cn/raw/master/install-cn.sh | bash -s -- --preflight-only
```

拿到一张链路健康表，确认环境没问题。

### 第 2 步：正式安装

```bash
curl -fsSL https://gitee.com/<账号>/pilot-cn/raw/master/install-cn.sh | bash
```

脚本会依次完成：环境层配置 → 安装 Pilot → 建 bench → 装 Frappe + ERPNext → 验收。

### 第 3 步：访问

浏览器打开脚本打印的地址，用 `Administrator` 登录。

### 第 4 步：上生产（可选）

```bash
pilot -b main setup production --admin-domain admin.example.com
```

> ⚠️ 不要传 `--tls`。国内未备案域名用不了自动申请证书，改用云厂商证书放进配置好的证书目录。

---

## 十五、参考

- [frappe/pilot](https://github.com/frappe/pilot) — 官方仓库
- [frappe/bench](https://github.com/frappe/bench) — 上一代工具，其 README 指向 Pilot
- [frappe/frappe_docker](https://github.com/frappe/frappe_docker) — 官方 Docker 方案
- [Frappe 论坛](https://discuss.frappe.io/)

---

## 附：本文档的定位

这份 README 同时是**设计说明**和**维护指南**。✅ 表示已实现，🔧 表示待实现。

**改动前请重点看**：

1. 第二节的**四条铁律** —— 这是底线，动了就要重来
2. 第四节的**三层架构** —— 决定了改动应该放在哪一层
3. 第十节的**改动清单** —— 已经改过哪些文件
4. 第十二节的**日常维护** —— 升级和部署命令

**新改动的落点**：

1. 能写进配置文件（第 0 层）的，绝不写进代码
2. 必须改 Pilot 源码的，收进 `cn/patches/pilot-cn-mods.patch`，改动越少越好
3. 属于我们自己的东西（脚本、词表、源配置）放 `cn/` 和 `config/`，升级不会碰

**每次改完源码的三步**：

```bash
# 1. 重新生成补丁，保证升级时能重放
git diff upstream-base -- pilot/ admin/ ':(exclude)admin/frontend/in-app-embed/dev.sh' > cn/patches/pilot-cn-mods.patch

# 2. 前端源码改过就重新编译（否则界面还是旧的）
cd admin/frontend/dashboard && npm install && npm run build

# 3. 部署到运行实例（可选 --restart 重启 bench）
sudo cn/deploy.sh --restart
```
