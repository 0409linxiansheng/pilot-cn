# 上游版本锚点

## 当前锚定

| 项 | 值 |
|---|---|
| 上游仓库 | https://github.com/frappe/pilot |
| 上游 tag | **`v0.0.64-pre-alpha`** |
| 上游提交 | `dff18814bdf30c236daae8ef630e78624c7672a1` |
| 提交时间 | 2026-10-14 |
| 提交说明 | Merge pull request #637 from prathameshkurunkar7/feature/central-cmd-forwarding |
| 许可证 | AGPL-3.0 |

本仓库的 Pilot 源码就是这个提交的完整快照，未做过上游合并。

## 关键约束：不要创建 VERSION 文件

`pilot/__init__.py` 的版本判定：

```python
def _read_version() -> str:
    version_file = Path(__file__).resolve().parent.parent / "VERSION"
    return version_file.read_text().strip() if version_file.exists() else "dev"

__version__ = _read_version()
is_dev_build = __version__ == "dev"
```

`VERSION` 文件**只在官方发布 tarball 里存在**，源码检出状态下不存在。这不是疏漏，而是我们必须保持的状态：

| VERSION 文件 | `is_dev_build` | `pilot admin upgrade` 走哪条路 | 国内可用 |
|---|---|---|---|
| **不存在**（当前） | `True` | `git pull`（`updater.py:61-72`） | ✅ 走我们的 git 改写规则 |
| 存在 | `False` | `api.github.com` + release 下载（`updater.py:75-103`） | ❌ **死路** |

**所以本仓库必须永远不提交 `VERSION` 文件。** 根目录 `.gitignore` 里已有 `/VERSION`，保持现状。

`is_dev_build = True` 还会带来两个副作用，都是我们想要的：

1. 首次安装时会用 npm 本地编译 Admin 界面（`managers/environment.py:111-121`），走我们配好的 npm 镜像
2. `allow_bench_management` 在开发安装下默认开启，一个 Admin 界面可以管多个 bench

## 同步上游的流程

```bash
# 1. 查上游最新 tag
git ls-remote --tags https://github.com/frappe/pilot | tail -5

# 2. 取指定版本到临时目录
git clone --depth 1 --branch <tag> https://github.com/frappe/pilot /tmp/pilot-upstream

# 3. 对照我们的改动（见 README 第十节）
diff -ru /tmp/pilot-upstream/pilot <本仓库>/pilot

# 4. 把上游改动合入本仓库，冲突处按我们的改动清单处理
```

改动清单越短，这一步越省事。这是本项目的核心维护成本，见 `README.md` 第十二节。
