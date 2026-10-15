from __future__ import annotations

import subprocess
from pathlib import Path

from pilot.integrations.git.base import GitProvider, GitProviderError


class LocalProvider(GitProvider):
    """A local directory as an app source (no remote, no API)."""

    name = "local"
    host = ""  # 空 host 表示本地路径

    def validate(self) -> dict:
        return {"login": "local", "name": "Local"}

    def list_repos(self) -> list[dict]:
        return []

    def auth_config(self, repo_url: str) -> dict[str, str]:
        return {}

    def _dir(self, repo_url: str) -> Path:
        path = Path(repo_url).expanduser()
        if not path.is_dir():
            raise GitProviderError(f"Local path does not exist: {repo_url!r}")
        return path

    def list_branches(self, full_name: str) -> list[str]:
        path = self._dir(full_name)
        try:
            result = subprocess.run(
                ["git", "-C", str(path), "branch", "--format=%(refname:short)"],
                capture_output=True, text=True, timeout=15,
            )
        except (subprocess.TimeoutExpired, OSError) as exc:
            raise GitProviderError("Git is required to list local branches.") from exc
        if result.returncode != 0:
            return []
        return [line.strip() for line in result.stdout.splitlines() if line.strip()]

    def get_default_branch(self, full_name: str) -> str:
        path = self._dir(full_name)
        try:
            result = subprocess.run(
                ["git", "-C", str(path), "symbolic-ref", "--short", "HEAD"],
                capture_output=True, text=True, timeout=15,
            )
        except (subprocess.TimeoutExpired, OSError):
            return ""
        return result.stdout.strip() if result.returncode == 0 else ""

    def fetch_raw_file(self, repo_url: str, path: str, ref: str = "HEAD") -> str:
        local = self._dir(repo_url)
        try:
            return (local / path).read_text()
        except OSError as exc:
            raise GitProviderError(f"{path} not found in {repo_url!r}.") from exc
