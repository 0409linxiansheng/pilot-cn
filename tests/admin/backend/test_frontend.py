from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

import pilot
from admin.backend import frontend
from pilot.exceptions import BenchError


def _layout(root: Path, *, source: bool, dist: bool) -> None:
    if source:
        pkg = root / "admin" / "frontend" / "dashboard" / "package.json"
        pkg.parent.mkdir(parents=True, exist_ok=True)
        pkg.write_text("{}")
    if dist:
        assets = root / "admin" / "backend" / "static" / "dashboard" / "assets"
        assets.mkdir(parents=True, exist_ok=True)


def _ensure(root: Path, *, is_dev: bool) -> object:
    with (
        patch.object(pilot, "is_dev_build", is_dev),
        patch("pilot.utils.cli_root", return_value=root),
        patch.object(frontend, "build_admin_frontend") as build,
    ):
        frontend.ensure_admin_frontend()
    return build


def test_released_install_serves_dist_without_building(tmp_path: Path) -> None:
    _layout(tmp_path, source=True, dist=True)
    build = _ensure(tmp_path, is_dev=False)
    build.assert_not_called()


def test_dev_build_compiles_from_source(tmp_path: Path) -> None:
    _layout(tmp_path, source=True, dist=True)
    build = _ensure(tmp_path, is_dev=True)
    build.assert_called_once()


def test_build_frontend_skips_when_dist_already_exists(tmp_path: Path) -> None:
    frontend_dir = tmp_path / "frontend"
    dist_dir = tmp_path / "dist"
    frontend_dir.mkdir(parents=True)
    (dist_dir / "assets").mkdir(parents=True)

    with patch("pilot.utils.run_command") as run_command:
        frontend._build_frontend(frontend_dir, dist_dir, "dashboard", lambda message: None)
    run_command.assert_not_called()


def test_build_frontend_skips_when_in_app_embed_iife_exists(tmp_path: Path) -> None:
    frontend_dir = tmp_path / "frontend"
    dist_dir = tmp_path / "dist"
    frontend_dir.mkdir(parents=True)
    dist_dir.mkdir(parents=True)
    (dist_dir / "cloud-settings.js").write_text("// iife")

    with patch("pilot.utils.run_command") as run_command:
        frontend._build_frontend(frontend_dir, dist_dir, "in-app-embed", lambda message: None)
    run_command.assert_not_called()


def test_build_frontend_builds_when_dist_is_missing(tmp_path: Path) -> None:
    frontend_dir = tmp_path / "frontend"
    dist_dir = tmp_path / "dist"
    frontend_dir.mkdir(parents=True)

    with patch("pilot.utils.run_command") as run_command:
        frontend._build_frontend(frontend_dir, dist_dir, "dashboard", lambda message: None)
    run_command.assert_any_call(["npm", "run", "build"], cwd=frontend_dir, stream_output=True)


def test_build_frontend_forces_rebuild_even_when_dist_exists(tmp_path: Path) -> None:
    frontend_dir = tmp_path / "frontend"
    dist_dir = tmp_path / "dist"
    frontend_dir.mkdir(parents=True)
    (dist_dir / "assets").mkdir(parents=True)

    with patch("pilot.utils.run_command") as run_command:
        frontend._build_frontend(frontend_dir, dist_dir, "dashboard", lambda message: None, force=True)
    run_command.assert_any_call(["npm", "run", "build"], cwd=frontend_dir, stream_output=True)


def test_released_install_without_dist_raises(tmp_path: Path) -> None:
    _layout(tmp_path, source=True, dist=False)
    with (
        patch.object(pilot, "is_dev_build", False),
        patch("pilot.utils.cli_root", return_value=tmp_path),
        pytest.raises(BenchError, match="missing from this release"),
    ):
        frontend.ensure_admin_frontend()
