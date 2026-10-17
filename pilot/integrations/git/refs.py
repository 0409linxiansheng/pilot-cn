"""Remote ref listing over the git transport.

`git ls-remote` is the one call that behaves the same for GitHub, Gitee, and any
self-hosted remote, and it is covered by git's ``url.<mirror>.insteadOf`` rewrite -
which is exactly the knob a CN install turns to reach github.com. The hosting APIs
(``api.github.com``) are *not* covered by that rewrite, so the wizard asks git
instead of an API when it needs the list of branches and tags.

A mirror of frappe can carry hundreds of pull-request branches and over a thousand
tags, which is noise in a picker. :meth:`RemoteRefs.wizard_choices` keeps the ones
anyone actually deploys (version lines and release tags) and lets the combobox's
free-text entry cover anything else.
"""

from __future__ import annotations

import re
import subprocess
import threading
import time
from dataclasses import dataclass

from pilot.internal.git import git_env

LS_TIMEOUT_SECONDS = 20
CACHE_TTL_SECONDS = 10 * 60
MAX_BRANCHES = 60
MAX_TAGS = 120

# version-16, version-15-hotfix, develop, main, master, staging
_RELEASE_BRANCH_RE = re.compile(r"^(?:version-\d+(?:-hotfix)?|develop|main|master|staging)$")
# v16.51.0, 16.51.0, v1_2_3 - a tag that names a release rather than a build
_VERSION_TAG_RE = re.compile(r"^v?\d+(?:[._-]\d+)*$")


class GitRefsError(Exception):
    """The remote's refs could not be listed."""


@dataclass(frozen=True)
class RemoteRefs:
    """Every branch and tag a remote advertises."""

    branches: list[str]
    tags: list[str]

    @property
    def truncated(self) -> bool:
        """Whether the wizard's list drops refs this repo actually has."""
        return len(self.branches) > MAX_BRANCHES or len(self.tags) > MAX_TAGS

    def wizard_choices(self) -> list[str]:
        """Branches, newest version line first, then tags, newest release first."""
        heads = [branch for branch in self.branches if _RELEASE_BRANCH_RE.match(branch)]
        if len(heads) < 3:
            # No version-* layout: show what there is rather than hiding everything.
            heads = list(self.branches)
        tags = [tag for tag in self.tags if _VERSION_TAG_RE.match(tag)] or list(self.tags)
        # dict.fromkeys: a name can be both a branch and a tag.
        return list(
            dict.fromkeys(
                sorted(heads, key=_release_key, reverse=True)[:MAX_BRANCHES]
                + _newest_first(tags)[:MAX_TAGS]
            )
        )


def parse_refs(output: str) -> RemoteRefs:
    """Parse ``git ls-remote`` output (peeled ``^{}`` tag lines dropped)."""
    branches: list[str] = []
    tags: list[str] = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        ref = parts[1]
        if ref.startswith("refs/heads/"):
            branches.append(ref[len("refs/heads/") :])
        elif ref.startswith("refs/tags/"):
            tag = ref[len("refs/tags/") :]
            if not tag.endswith("^{}"):
                tags.append(tag)
    return RemoteRefs(branches=branches, tags=tags)


def _natural_key(name: str) -> tuple:
    """Sort key where v16.9.0 < v16.51.0 (integers, not text, compare)."""
    parts = re.split(r"(\d+)", name)
    return tuple((0, int(part)) if part.isdigit() else (1, part) for part in parts if part)


def _newest_first(names: list[str]) -> list[str]:
    return sorted(names, key=_natural_key, reverse=True)


def _release_key(name: str):
    """version-16 before version-16-hotfix: the hotfix only breaks ties."""
    hotfix = name.endswith("-hotfix")
    return (_natural_key(name.removesuffix("-hotfix")), 0 if hotfix else 1)


_cache: dict[str, tuple[float, RemoteRefs]] = {}
_cache_lock = threading.Lock()


def clear_cache() -> None:
    """Forget cached listings (tests, and after a repository is changed)."""
    with _cache_lock:
        _cache.clear()


def list_remote_refs(repo_url: str, timeout: int = LS_TIMEOUT_SECONDS) -> RemoteRefs:
    """Branches and tags of *repo_url* via ``git ls-remote``.

    Raises :class:`GitRefsError` for anything git could not read; callers are
    expected to degrade rather than surface a network failure to the user.
    """
    url = (repo_url or "").strip()
    if not url:
        raise GitRefsError("A repository URL is required.")

    now = time.monotonic()
    with _cache_lock:
        cached = _cache.get(url)
        if cached is not None and cached[0] > now:
            return cached[1]

    env = git_env()
    # Never wait on a credential prompt: this runs inside a web request.
    env["GIT_TERMINAL_PROMPT"] = "0"
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--heads", "--tags", url],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired as exc:
        raise GitRefsError(f"Timed out listing refs for {url}.") from exc
    except OSError as exc:
        raise GitRefsError("Git is required to list repository refs.") from exc

    if result.returncode != 0:
        detail = [line for line in (result.stderr or "").splitlines() if line.strip()]
        raise GitRefsError(detail[-1] if detail else f"Could not list refs for {url}.")

    refs = parse_refs(result.stdout)
    if not refs.branches and not refs.tags:
        raise GitRefsError(f"{url} has no branches or tags.")

    with _cache_lock:
        _cache[url] = (now + CACHE_TTL_SECONDS, refs)
    return refs
