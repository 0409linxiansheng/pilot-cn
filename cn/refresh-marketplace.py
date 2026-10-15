#!/usr/bin/env python3
"""刷新本地/Gitee 上的 marketplace registry 到最新 git tag（国内可用）。

官方 frappe/marketplace 的 release 信息经常落后于 git tag（例如 hrms 的
version-16 分支显示 16.20.1，但实际分支顶端已是 v16.51.0）。本脚本对每个应用
走 `git ls-remote`（经 insteadOf 走 Gitee 镜像 / ghfast.top 代理）取分支顶端
和最新 tag，重写 registry 的 apps/<name>.json，让管理面板市场显示最新版本。

用法：
    python3 cn/refresh-marketplace.py <registry 工作副本> [仓库名过滤]

示例（只刷 hrms）：
    python3 cn/refresh-marketplace.py /home/erpnext/pilot-marketplace hrms
"""
import json
import subprocess
import sys
from pathlib import Path


def _run(args, timeout=30):
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return r.stdout if r.returncode == 0 else ""
    except Exception:
        return ""


def ls_remote(repo_url):
    """返回 {ref: sha}；每个应用只调用一次。"""
    refs = {}
    for line in _run(["git", "ls-remote", repo_url]).splitlines():
        parts = line.split()
        if len(parts) >= 2:
            refs[parts[1]] = parts[0]
    return refs


def latest_tag_and_sha(refs, branch):
    """返回 (tag, sha)：分支顶端 sha，以及指向它的最新版本 tag。"""
    tip = refs.get(f"refs/heads/{branch}", "")
    tags = {
        ref[len("refs/tags/"):]: sha
        for ref, sha in refs.items()
        if ref.startswith("refs/tags/") and not ref.endswith("^{}")
    }
    for tag in sorted(tags, reverse=True):
        peeled = refs.get(f"refs/tags/{tag}^{{}}", tags[tag])
        if peeled == tip:
            return tag, tip
    return "", tip


def _commit(registry: Path) -> None:
    """把刷新结果 commit 进 registry 仓库（先 ff-pull），避免弄脏工作区。"""
    if not (registry / ".git").exists():
        return
    subprocess.run(["git", "-C", str(registry), "pull", "--ff-only", "--quiet"], check=False)
    subprocess.run(["git", "-C", str(registry), "add", "-A"], check=False)
    r = subprocess.run(
        [
            "git", "-C", str(registry),
            "-c", "user.name=pilot-cn",
            "-c", "user.email=pilot-cn@localhost",
            "commit", "-m", "chore: refresh app versions from git tags",
        ],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        p = subprocess.run(["git", "-C", str(registry), "push", "origin", "HEAD"], capture_output=True, text=True)
        print("已 commit 并 push 刷新结果" if p.returncode == 0 else f"已 commit，push 失败: {p.stderr.strip()[:200]}")
    else:
        print("commit 无变化或失败")


def refresh(registry: Path, repo_filter=""):
    apps_json = registry / "apps.json"
    if not apps_json.exists():
        print(f"{apps_json} 不存在")
        return 0
    apps = json.loads(apps_json.read_text())
    targets = [
        a for a in apps
        if a.get("name") and a.get("repo") and (not repo_filter or repo_filter in a["repo"])
    ]
    total = len(targets)
    updated = 0
    for i, app in enumerate(targets, 1):
        name, repo = app["name"], app["repo"]
        rel_file = registry / "apps" / f"{name}.json"
        if not rel_file.exists():
            continue
        try:
            data = json.loads(rel_file.read_text())
        except Exception:
            continue
        refs = ls_remote(repo)  # 每个应用只拉一次
        changed = False
        for rel in data.get("releases", []):
            branch = rel.get("branch", "")
            if not branch:
                continue
            tag, sha = latest_tag_and_sha(refs, branch)
            if sha and sha != rel.get("commit"):
                rel["commit"] = sha
                if tag:
                    rel["version"] = tag.lstrip("v")
                print(f"{name}: {branch} -> {tag or sha[:8]}", flush=True)
                changed = True
        if changed:
            rel_file.write_text(json.dumps(data, indent=2) + "\n")
            updated += 1
        if i % 10 == 0:
            print(f"... 进度 {i}/{total}", flush=True)
    if updated:
        _commit(registry)
    print(f"已更新 {updated} 个应用")
    return updated


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    refresh(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "")
