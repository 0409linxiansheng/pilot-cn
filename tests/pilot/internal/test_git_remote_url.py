"""GitRepo.remote_url must not leak an insteadOf rewrite into bench.toml."""

from __future__ import annotations

import subprocess
from pathlib import Path

from pilot.internal.git import GitRepo

REPO_URL = "https://github.com/frappe/erpnext"
MIRROR = "https://ghfast.top/https://github.com/"


def _git(path: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(path), *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def test_remote_url_is_the_configured_url_not_the_insteadof_expansion(
    tmp_path: Path, monkeypatch
) -> None:
    repo = tmp_path / "erpnext"
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    _git(repo, "remote", "add", "origin", REPO_URL)

    # A CN install rewrites github.com at the git layer, not in bench.toml.
    monkeypatch.setenv("GIT_CONFIG_COUNT", "1")
    monkeypatch.setenv("GIT_CONFIG_KEY_0", f"url.{MIRROR}.insteadOf")
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", "https://github.com/")

    # git itself hands back the rewritten URL...
    assert _git(repo, "remote", "get-url", "origin") == MIRROR + "frappe/erpnext"
    # ...but what we record (and match apps by) stays the configured URL.
    assert GitRepo(repo).remote_url == REPO_URL
