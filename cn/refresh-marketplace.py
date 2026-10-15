#!/usr/bin/env python3
"""刷新本地 marketplace registry 缓存到最新 git tag（国内可用）。

官方 frappe/marketplace 的 release 信息经常落后于 git tag（例如 hrms 的
version-16 分支显示 16.20.1，但实际分支顶端已是 v16.51.0）。本脚本对每个应用
走 `git ls-remote`（经 insteadOf 走 Gitee 镜像 / ghfast.top 代理）取分支顶端
和最新 tag，重写本地 registry 的 apps/<name>.json，让管理面板市场显示最新版本。

用法：
    python3 cn/refresh-marketplace.py <registry-cache 目录> [仓库名过滤]

示例（只刷 hrms）：
    python3 cn/refresh-marketplace.py /home/erpnext/pilot/system/registry-cache hrms
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
    refs = {}
    for line in _run(["git", "ls-remote", repo_url]).splitlines():
        parts = line.split()
        if len(parts) >= 2:
            refs[parts[1]] = parts[0]
    return refs


def latest_tag_and_sha(repo_url, branch):
    refs = ls_remote(repo_url)
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


def refresh(registry: Path, repo_filter=""):
    apps_json = registry / "apps.json"
    if not apps_json.exists():
        print(f"{apps_json} 不存在")
        return 0
    apps = json.loads(apps_json.read_text())
    updated = 0
    for app in apps:
        name = app.get("name", "")
        repo = app.get("repo", "")
        if not name or not repo:
            continue
        if repo_filter and repo_filter not in repo:
            continue
        rel_file = registry / "apps" / f"{name}.json"
        if not rel_file.exists():
            continue
        try:
            data = json.loads(rel_file.read_text())
        except Exception:
            continue
        changed = False
        for rel in data.get("releases", []):
            branch = rel.get("branch", "")
            if not branch:
                continue
            tag, sha = latest_tag_and_sha(repo, branch)
            if sha and sha != rel.get("commit"):
                rel["commit"] = sha
                if tag:
                    rel["version"] = tag.lstrip("v")
                print(f"{name}: {branch} -> {tag or sha[:8]}")
                changed = True
        if changed:
            rel_file.write_text(json.dumps(data, indent=2) + "\n")
            updated += 1
    print(f"已更新 {updated} 个应用")
    return updated


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    registry = Path(sys.argv[1])
    repo_filter = sys.argv[2] if len(sys.argv) > 2 else ""
    refresh(registry, repo_filter)
