"""The wizard prefills the repository and tag the installer wrote into bench.toml."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from admin.backend.api.v1.setup.config import framework_source, read_defaults
from admin.backend.app import create_app
from pilot.config import BenchConfig
from pilot.config.bench import AppConfig
from pilot.integrations.git.refs import GitRefsError, RemoteRefs

FRAPPE_REPO = "https://gitee.com/linxiansheng0409/frappe"


def _write_bench_toml(bench_root: Path) -> Path:
    bench_root.mkdir(parents=True, exist_ok=True)
    (bench_root / "bench.toml").write_text(
        '[bench]\nname = "main"\npython = "3.12"\n\n'
        "[[apps]]\n"
        'name = "erpnext"\n'
        'repo = "https://gitee.com/linxiansheng0409/erpnext"\n'
        'branch = "version-15"\n\n'
        "[[apps]]\n"
        'name = "frappe"\n'
        f'repo = "{FRAPPE_REPO}"\n'
        'branch = "v16.51.0"\n',
        encoding="utf-8",
    )
    return bench_root


def test_framework_source_finds_the_entry_by_name(tmp_path: Path) -> None:
    assert framework_source(_write_bench_toml(tmp_path)) == (FRAPPE_REPO, "v16.51.0")


def test_framework_source_is_none_without_bench_toml(tmp_path: Path) -> None:
    assert framework_source(tmp_path) is None


def test_read_defaults_prefills_the_frappe_entry_not_the_first_app(tmp_path: Path) -> None:
    result = read_defaults(_write_bench_toml(tmp_path))
    assert result["app_repo"] == FRAPPE_REPO
    assert result["app_branch"] == "v16.51.0"


def _make_bench(bench_root: Path) -> Path:
    bench_root.mkdir(parents=True, exist_ok=True)
    config = BenchConfig.from_flat(
        bench_root.name, {"admin_enabled": True, "admin_password": "admin-secret"}
    )
    config.apps = [AppConfig(name="frappe", repo=FRAPPE_REPO, branch="v16.51.0")]
    config.write(bench_root)
    return bench_root


def _client(bench_root: Path):
    from admin.backend.internal.session import Session
    from pilot.core.bench import Bench

    app = create_app(bench_root)
    app.config["TESTING"] = True
    client = app.test_client()
    client.set_cookie("pilot_sid", Session(Bench(bench_root)).issue_session_token()[0])
    return client


def test_framework_branches_returns_branches_and_tags(tmp_path: Path) -> None:
    client = _client(_make_bench(tmp_path / "main"))
    refs = RemoteRefs(branches=["develop", "version-16"], tags=["v16.51.0", "v16.50.0"])
    with patch("admin.backend.api.v1.setup.list_remote_refs", return_value=refs):
        response = client.get("/api/v1/setup/framework-branches")
    assert response.status_code == 200
    body = response.get_json()
    assert body["source"] == "remote"
    assert body["repo"] == FRAPPE_REPO
    assert body["branches"] == ["version-16", "develop", "v16.51.0", "v16.50.0"]


def test_framework_branches_can_list_another_repository(tmp_path: Path) -> None:
    client = _client(_make_bench(tmp_path / "main"))
    other = "https://gitee.com/linxiansheng0409/erpnext"
    with patch(
        "admin.backend.api.v1.setup.list_remote_refs",
        return_value=RemoteRefs(branches=["main"], tags=[]),
    ) as listed:
        response = client.get(f"/api/v1/setup/framework-branches?repo={other}")
    assert response.status_code == 200
    assert response.get_json()["repo"] == other
    assert listed.call_args.args[0] == other


def test_framework_branches_falls_back_when_the_remote_is_unreachable(tmp_path: Path) -> None:
    client = _client(_make_bench(tmp_path / "main"))
    with patch(
        "admin.backend.api.v1.setup.list_remote_refs",
        side_effect=GitRefsError("Timed out listing refs."),
    ):
        response = client.get("/api/v1/setup/framework-branches")
    assert response.status_code == 200
    body = response.get_json()
    assert body["source"] == "fallback"
    assert body["branches"] == ["version-16", "develop"]


def test_framework_branches_rejects_a_non_git_url(tmp_path: Path) -> None:
    client = _client(_make_bench(tmp_path / "main"))
    response = client.get("/api/v1/setup/framework-branches?repo=ftp://example.com/repo")
    assert response.status_code == 422
