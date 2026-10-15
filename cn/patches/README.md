# pilot-cn 源码改动补丁

## 这是什么

`pilot-cn-mods.patch` 记录了 **pilot-cn 对上游 Pilot 源码的全部改动**，用于"上游升级后自动重放"。

- **基线**：上游 `v0.0.64-pre-alpha`（pilot-cn 的初始提交就是它的 pristine 副本）
- **覆盖**：`pilot/` 与 `admin/` 下的 10 个文件
- **不包含**：我们自己的层（`cn/`、`config/`、`install-cn.sh`）——上游没有这些文件，永远不会被升级覆盖

## 补丁内容

| 文件 | 改动 |
|---|---|
| `pilot/integrations/git/github.py` | git 命令替代 GitHub API（列分支含 tag、默认分支、has_branch、读文件走 git 克隆）+ `GiteeProvider` |
| `pilot/integrations/git/local.py` | 新增 `LocalProvider`（本地目录作为应用源） |
| `pilot/integrations/git/__init__.py` | 注册 Gitee / Local provider，新增 `repo_full_name` |
| `pilot/core/app/__init__.py` | 已安装应用切换到不同 tag/branch（`_switch_to_commit`） |
| `pilot/core/app/repository.py` | `switch_branch` 支持 tag |
| `pilot/internal/git.py` | 新增 `remote_ref_sha`（分支或 tag 的 SHA） |
| `pilot/core/registry_cache.py` | 市场 registry 指向 Gitee（`PILOT_MARKETPLACE_URL` 可覆盖） |
| `admin/backend/middleware.py` | 面板 cookie `sid` → `pilot_sid`（避免与 Frappe 冲突） |
| `admin/backend/api/v1/auth.py` | 同上（登出删除对应 cookie） |
| `admin/backend/api/v1/git.py` | Gitee / 本地路径支持 |

## 怎么用

```bash
cn/upgrade.sh --list                # 看可选的上游版本
cn/upgrade.sh v0.0.66-pre-alpha     # 升级到该上游版本，并自动重放本补丁
git diff --stat                     # 检查
git add -A && git commit -m 'chore: upgrade vendored pilot to v0.0.66-pre-alpha'
```

升级原理：

```
上游新版本 ──checkout──▶ pilot/ admin/ 被替换成上游内容
                             │
                             ▼
             git apply --3way ◀── cn/patches/pilot-cn-mods.patch
                             │
                             ▼
             结果 = 上游新版 + pilot-cn 全部改动
```

`--3way` 以「上游 v0.0.64（基线）/ 我们的版本 / 上游新版」做三路合并，能自动吸收
上下文漂移；真冲突时会列出文件，停下来等你手工处理（脚本退出码 2）。

## 又改了源码之后：重新生成补丁

```bash
git diff upstream-base..HEAD -- pilot/ admin/ ':(exclude)admin/frontend/in-app-embed/dev.sh' \
  > cn/patches/pilot-cn-mods.patch
```

> `upstream-base` 是指向"上游 v0.0.64"的本地 tag，`cn/upgrade.sh` 首次运行时会自动补上
> `upstream` remote；如果本机没有这个 tag，先跑一次 `cn/upgrade.sh --list`。
