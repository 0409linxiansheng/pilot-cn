"""Building an app's assets must restart web, or the cached manifest serves 404s."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from pilot.config import AppConfig
from pilot.core.app import App
from tests.pilot.commands.test_commands import make_bench


def test_building_app_assets_reloads_the_web_process(tmp_path: Path) -> None:
    bench = make_bench(tmp_path)
    app = App(AppConfig(name="erpnext", repo="https://example.com/erpnext.git", branch="main"), bench)

    with (
        patch("pilot.managers.environment.PythonEnvManager.build_assets_for_app") as build,
        patch.object(bench, "reload_workers") as reload,
    ):
        app._build_assets_via_env_manager()

    build.assert_called_once_with(app)
    reload.assert_called_once_with(web_only=True)
