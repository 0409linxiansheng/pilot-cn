"""A stale wizard marker must not keep an initialised bench on the setup screen."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from admin.backend.app import create_app
from pilot.config import BenchConfig
from pilot.internal.tasks.store import TaskStore
from pilot.managers.task.models import TaskStatus

MARKER = ".wizard-active"


def _client(bench_root: Path):
    from admin.backend.internal.session import Session
    from pilot.core.bench import Bench

    app = create_app(bench_root)
    app.config["TESTING"] = True
    client = app.test_client()
    client.set_cookie("pilot_sid", Session(Bench(bench_root)).issue_session_token()[0])
    return client


def _initialised_bench(tmp_path: Path) -> Path:
    """A bench that looks initialised: bench.toml with an admin password and a venv."""
    bench_root = tmp_path / "main"
    bench_root.mkdir(parents=True)
    BenchConfig.write_flat(bench_root, "main", {"admin_enabled": True, "admin_password": "admin-secret"})
    python = bench_root / "env" / "bin" / "python"
    python.parent.mkdir(parents=True)
    python.touch()
    return bench_root


def _start_setup(client) -> str:
    client.put("/api/v1/setup/configuration", json={"mariadb_password": "database-secret"})
    with patch("pilot.internal.tasks.runner.task_workers.wake"):
        response = client.post(
            "/api/v1/setup/actions/start",
            headers={"Idempotency-Key": "wizard-setup"},
        )
    return response.get_json()["task_id"]


def _finish_task(bench_root: Path, task_id: str) -> None:
    store = TaskStore(bench_root)
    store.transition(
        task_id,
        TaskStatus.QUEUED,
        TaskStatus.RUNNING,
        {"started_at": "2026-07-15T12:00:01+00:00"},
    )
    store.transition(
        task_id,
        TaskStatus.RUNNING,
        TaskStatus.SUCCESS,
        {"finished_at": "2026-07-15T12:00:02+00:00", "exit_code": 0},
    )


def test_bootstrap_clears_a_marker_whose_task_does_not_exist(tmp_path: Path) -> None:
    bench_root = _initialised_bench(tmp_path)
    client = _client(bench_root)
    (bench_root / MARKER).write_text("20260715-120000-ffffff", encoding="utf-8")

    assert client.get("/api/v1/bootstrap").get_json()["mode"] == "admin"
    assert not (bench_root / MARKER).exists()


def test_bootstrap_clears_a_marker_left_by_a_failed_task(tmp_path: Path) -> None:
    bench_root = _initialised_bench(tmp_path)
    client = _client(bench_root)
    task_id = _start_setup(client)
    store = TaskStore(bench_root)
    store.transition(task_id, TaskStatus.QUEUED, TaskStatus.RUNNING)
    store.transition(
        task_id,
        TaskStatus.RUNNING,
        TaskStatus.FAILED,
        {"finished_at": "2026-07-15T12:00:02+00:00", "exit_code": 1},
    )

    assert client.get("/api/v1/bootstrap").get_json()["mode"] == "admin"
    assert not (bench_root / MARKER).exists()


def test_bootstrap_keeps_the_marker_while_the_task_awaits_finish(tmp_path: Path) -> None:
    bench_root = _initialised_bench(tmp_path)
    client = _client(bench_root)
    task_id = _start_setup(client)
    _finish_task(bench_root, task_id)

    assert client.get("/api/v1/bootstrap").get_json()["mode"] == "setup"
    assert (bench_root / MARKER).read_text(encoding="utf-8") == task_id


def test_bootstrap_keeps_the_marker_while_the_task_is_running(tmp_path: Path) -> None:
    bench_root = _initialised_bench(tmp_path)
    client = _client(bench_root)
    task_id = _start_setup(client)
    TaskStore(bench_root).transition(task_id, TaskStatus.QUEUED, TaskStatus.RUNNING)

    assert client.get("/api/v1/bootstrap").get_json()["mode"] == "setup"
    assert (bench_root / MARKER).exists()
