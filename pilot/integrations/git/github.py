from __future__ import annotations

import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request

from pilot.integrations.git.base import (
    GitAuthError,
    GitProvider,
    GitProviderError,
    basic_auth_config,
    normalize_to_https,
)
from pilot.internal.git import git_env

GITHUB_HOST = "github.com"
GITEE_HOST = "gitee.com"
_OWNER_REPO_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _parse_owner_repo(repo_url: str, host: str) -> tuple[str, str]:
    """Extract (owner, repo) from a URL hosted at `host`."""
    url = normalize_to_https(repo_url).rstrip("/").removesuffix(".git")
    parts = url.split("/")
    if len(parts) < 5 or urllib.parse.urlsplit(url).hostname != host:
        raise GitProviderError(f"Cannot parse owner/repo from URL: {repo_url!r}")
    owner, repository = parts[-2], parts[-1]
    if not (_OWNER_REPO_RE.match(owner) and _OWNER_REPO_RE.match(repository)):
        raise GitProviderError(f"Cannot parse owner/repo from URL: {repo_url!r}")
    return owner, repository


def parse_github_owner_repo(repo_url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL."""
    return _parse_owner_repo(repo_url, GITHUB_HOST)


def parse_gitee_owner_repo(repo_url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a Gitee URL."""
    return _parse_owner_repo(repo_url, GITEE_HOST)


class GitHubProvider(GitProvider):
    name = "github"
    host = GITHUB_HOST
    api_base = "https://api.github.com"

    def _headers(self) -> dict:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "pilot",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def validate(self) -> dict:
        data, _ = self._get_json(f"{self.api_base}/user", self._headers())
        return {"login": data.get("login"), "name": data.get("name")}

    def list_repos(self) -> list[dict]:
        repos: list[dict] = []
        # A couple of pages of the most recently pushed repos is plenty for a
        # picker; the user can always paste a URL for anything older.
        for page in range(1, 4):
            url = (
                f"{self.api_base}/user/repos"
                f"?per_page=100&page={page}&sort=pushed&affiliation=owner,collaborator,organization_member"
            )
            batch, _ = self._get_json(url, self._headers())
            if not batch:
                break
            for r in batch:
                repos.append(
                    {
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "private": r.get("private", False),
                        "description": r.get("description") or "",
                        "default_branch": r.get("default_branch") or "",
                        "clone_url": r.get("clone_url") or "",
                    }
                )
            if len(batch) < 100:
                break
        return repos

    def auth_config(self, repo_url: str) -> dict[str, str]:
        return basic_auth_config(repo_url, "x-access-token", self.token)

    def list_branches(self, full_name: str) -> list[str]:
        repo_url = f"https://{self.host}/{full_name}"
        try:
            result = subprocess.run(
                ["git", "ls-remote", repo_url],
                capture_output=True,
                text=True,
                timeout=30,
                env=git_env(self.auth_config(repo_url)),
            )
        except subprocess.TimeoutExpired as exc:
            raise GitProviderError(f"Timed out listing branches for {full_name}.") from exc
        except OSError as exc:
            raise GitProviderError("Git is required to list repository branches.") from exc
        if result.returncode != 0:
            if "authentication failed" in result.stderr.lower():
                raise GitAuthError(f"GitHub rejected the stored token for {full_name}.")
            raise GitProviderError(f"Could not list branches for {full_name}.")
        branches: list[str] = []
        tags: list[str] = []
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) < 2:
                continue
            ref = parts[1]
            if ref.startswith("refs/heads/"):
                branches.append(ref[len("refs/heads/"):])
            elif ref.startswith("refs/tags/"):
                tag = ref[len("refs/tags/"):]
                if not tag.endswith("^{}"):
                    tags.append(tag)
        # 分支在前（保持 git 顺序），标签按名称倒序（高版本靠前）
        return branches + sorted(set(tags), reverse=True)

    def has_branch(self, full_name: str, branch: str) -> bool:
        # 用 git ls-remote 检查分支或标签是否存在，不依赖 api.github.com（国内可达）
        repo_url = f"https://{self.host}/{full_name}"
        try:
            result = subprocess.run(
                ["git", "ls-remote", repo_url],
                capture_output=True,
                text=True,
                timeout=30,
                env=git_env(self.auth_config(repo_url)),
            )
        except (subprocess.TimeoutExpired, OSError):
            return False
        if result.returncode != 0:
            return False
        wanted = {f"refs/heads/{branch}", f"refs/tags/{branch}"}
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[1] in wanted:
                return True
        return False

    def get_default_branch(self, full_name: str) -> str:
        # 用 git ls-remote --symref 取默认分支，不依赖 api.github.com（国内可达）
        repo_url = f"https://{self.host}/{full_name}"
        try:
            result = subprocess.run(
                ["git", "ls-remote", "--symref", repo_url, "HEAD"],
                capture_output=True,
                text=True,
                timeout=30,
                env=git_env(self.auth_config(repo_url)),
            )
        except (subprocess.TimeoutExpired, OSError):
            return ""
        if result.returncode != 0:
            return ""
        for line in result.stdout.splitlines():
            if line.startswith("ref: refs/heads/"):
                rest = line[len("ref: refs/heads/"):]
                return rest.split()[0].strip()
        return ""

    def fetch_raw_file(self, repo_url: str, path: str, ref: str = "HEAD") -> str:
        # 用 git 浅克隆读取文件，不依赖 raw.githubusercontent.com（国内可达）
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmpdir:
            clone_args = ["git", "clone", "--depth", "1"]
            if ref and ref != "HEAD":
                clone_args += ["--branch", ref]
            clone_args += [repo_url, tmpdir]
            try:
                result = subprocess.run(
                    clone_args,
                    capture_output=True,
                    text=True,
                    timeout=120,
                    env=git_env(self.auth_config(repo_url)),
                )
            except subprocess.TimeoutExpired as exc:
                raise GitProviderError(f"Timed out reading {path} from repository.") from exc
            except OSError as exc:
                raise GitProviderError("Git is required to read repository files.") from exc
            if result.returncode != 0:
                if "authentication failed" in result.stderr.lower():
                    raise GitAuthError("GitHub rejected the stored token for this repository.")
                raise GitProviderError(f"Could not read repository at ref {ref!r}.")
            file_path = Path(tmpdir) / path
            try:
                return file_path.read_text()
            except OSError as exc:
                raise GitProviderError(f"{path} not found in repository.") from exc


class GiteeProvider(GitHubProvider):
    """Gitee (码云) provider, reusing the git-command implementations (no API dependency)."""
    name = "gitee"
    host = GITEE_HOST
    api_base = "https://gitee.com/api/v5"
