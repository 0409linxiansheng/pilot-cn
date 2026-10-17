"""Tests for pilot.integrations.git.refs - ls-remote parsing and the wizard's list."""

from __future__ import annotations

import subprocess

import pytest

from pilot.integrations.git import refs as refs_module
from pilot.integrations.git.refs import (
    GitRefsError,
    RemoteRefs,
    list_remote_refs,
    parse_refs,
)


@pytest.fixture(autouse=True)
def _fresh_cache():
    refs_module.clear_cache()
    yield
    refs_module.clear_cache()


def _completed(stdout: str = "", returncode: int = 0, stderr: str = "") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(args=["git"], returncode=returncode, stdout=stdout, stderr=stderr)


def test_parse_refs_keeps_heads_and_tags_and_drops_peeled_tag_lines() -> None:
    output = (
        "aaa\trefs/heads/develop\n"
        "bbb\trefs/tags/v16.51.0\n"
        "ccc\trefs/tags/v16.51.0^{}\n"
        "ddd\trefs/tags/v16.50.0\n"
    )
    refs = parse_refs(output)
    assert refs.branches == ["develop"]
    assert refs.tags == ["v16.51.0", "v16.50.0"]


def test_wizard_choices_orders_versions_numerically_not_lexically() -> None:
    refs = RemoteRefs(branches=["develop", "version-9", "version-16"], tags=["v16.9.0", "v16.51.0"])
    assert refs.wizard_choices() == ["version-16", "version-9", "develop", "v16.51.0", "v16.9.0"]


def test_wizard_choices_hides_pull_request_branch_noise() -> None:
    refs = RemoteRefs(
        branches=["develop", "version-14", "version-15", "version-16", "claude/ui-issue-eh6tqu"],
        tags=["v16.51.0"],
    )
    choices = refs.wizard_choices()
    assert "claude/ui-issue-eh6tqu" not in choices
    assert choices[:4] == ["version-16", "version-15", "version-14", "develop"]


def test_wizard_choices_puts_the_release_branch_before_its_hotfix() -> None:
    refs = RemoteRefs(
        branches=["version-16-hotfix", "version-16", "version-15", "develop"],
        tags=[],
    )
    assert refs.wizard_choices() == ["version-16", "version-16-hotfix", "version-15", "develop"]


def test_wizard_choices_shows_every_branch_when_the_repo_has_no_version_lines() -> None:
    refs = RemoteRefs(branches=["main", "feature-x"], tags=[])
    assert set(refs.wizard_choices()) == {"main", "feature-x"}


def test_wizard_choices_caps_a_mirror_with_thousands_of_refs() -> None:
    refs = RemoteRefs(
        branches=[f"version-{index}" for index in range(300)],
        tags=[f"v16.{index}.0" for index in range(300)],
    )
    assert len(refs.wizard_choices()) == refs_module.MAX_BRANCHES + refs_module.MAX_TAGS
    assert refs.truncated is True


def test_list_remote_refs_asks_git_once_and_caches_the_answer(monkeypatch) -> None:
    calls: list[list[str]] = []

    def run(args, **kwargs):
        calls.append(args)
        assert kwargs["env"]["GIT_TERMINAL_PROMPT"] == "0"
        return _completed("aaa\trefs/heads/version-16\nbbb\trefs/tags/v16.51.0\n")

    monkeypatch.setattr(refs_module.subprocess, "run", run)
    first = list_remote_refs("https://gitee.com/linxiansheng0409/frappe")
    second = list_remote_refs("https://gitee.com/linxiansheng0409/frappe")
    assert first == second
    assert len(calls) == 1
    assert calls[0][:4] == ["git", "ls-remote", "--heads", "--tags"]
    assert calls[0][-1] == "https://gitee.com/linxiansheng0409/frappe"


def test_list_remote_refs_reports_the_git_error(monkeypatch) -> None:
    monkeypatch.setattr(
        refs_module.subprocess,
        "run",
        lambda *args, **kwargs: _completed(returncode=128, stderr="fatal: repository not found"),
    )
    with pytest.raises(GitRefsError, match="repository not found"):
        list_remote_refs("https://gitee.com/linxiansheng0409/missing")


def test_list_remote_refs_turns_a_timeout_into_git_refs_error(monkeypatch) -> None:
    def run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="git", timeout=20)

    monkeypatch.setattr(refs_module.subprocess, "run", run)
    with pytest.raises(GitRefsError, match="Timed out"):
        list_remote_refs("https://gitee.com/linxiansheng0409/frappe")


def test_list_remote_refs_rejects_a_remote_with_no_refs(monkeypatch) -> None:
    monkeypatch.setattr(refs_module.subprocess, "run", lambda *args, **kwargs: _completed(""))
    with pytest.raises(GitRefsError, match="no branches or tags"):
        list_remote_refs("https://gitee.com/linxiansheng0409/empty")
