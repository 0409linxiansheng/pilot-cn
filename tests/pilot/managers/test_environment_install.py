"""PythonEnvManager.install_app: an unresolvable dev extra must not sink the bench."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from pilot.exceptions import CommandError
from pilot.managers.environment import PythonEnvManager


def _env_manager(tmp_path: Path) -> PythonEnvManager:
    return PythonEnvManager(SimpleNamespace(env_path=tmp_path / "env"))


def _app(tmp_path: Path, *, dev_extra: bool) -> SimpleNamespace:
    path = tmp_path / "apps" / "frappe"
    return SimpleNamespace(
        path=path,
        editable_target=f"{path}[dev]" if dev_extra else str(path),
    )


def test_install_app_installs_the_dev_extra_when_it_resolves(tmp_path: Path) -> None:
    manager = _env_manager(tmp_path)
    app = _app(tmp_path, dev_extra=True)
    with (
        patch("pilot.managers.environment.ensure_uv", return_value="/usr/local/bin/uv"),
        patch.object(manager, "_build_env", return_value={}),
        patch.object(manager, "_install_editable") as install,
    ):
        manager.install_app(app)
    install.assert_called_once_with(
        "/usr/local/bin/uv", str(tmp_path / "env" / "bin" / "python"), f"{app.path}[dev]"
    )


def test_install_app_retries_without_the_dev_extra_when_resolution_fails(tmp_path: Path) -> None:
    manager = _env_manager(tmp_path)
    app = _app(tmp_path, dev_extra=True)
    attempts: list[str] = []

    def install(uv: str, python: str, target: str) -> None:
        attempts.append(target)
        if target.endswith("[dev]"):
            raise CommandError("Command '/usr/local/bin/uv' failed with exit code 1.")

    with (
        patch("pilot.managers.environment.ensure_uv", return_value="/usr/local/bin/uv"),
        patch.object(manager, "_build_env", return_value={}),
        patch.object(manager, "_install_editable", side_effect=install),
    ):
        manager.install_app(app)
    assert attempts == [f"{app.path}[dev]", str(app.path)]


def test_install_app_reports_a_failure_of_the_plain_install(tmp_path: Path) -> None:
    manager = _env_manager(tmp_path)
    app = _app(tmp_path, dev_extra=False)
    with (
        patch("pilot.managers.environment.ensure_uv", return_value="/usr/local/bin/uv"),
        patch.object(manager, "_build_env", return_value={}),
        patch.object(manager, "_install_editable", side_effect=CommandError("uv failed")),
    ):
        with pytest.raises(CommandError):
            manager.install_app(app)
