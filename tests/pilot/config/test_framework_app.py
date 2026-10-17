"""The framework app is identified by name, not by its position in [[apps]]."""

from __future__ import annotations

from pilot.config.bench import AppConfig, BenchConfig


def _bench_with_erpnext_first() -> BenchConfig:
    config = BenchConfig.default("main")
    config.apps = [
        AppConfig(name="erpnext", repo="https://gitee.com/linxiansheng0409/erpnext", branch="version-15"),
        AppConfig(name="frappe", repo="https://gitee.com/linxiansheng0409/frappe", branch="v16.51.0"),
    ]
    return config


def test_framework_app_is_the_frappe_entry_not_the_first_one() -> None:
    assert _bench_with_erpnext_first().framework_app.name == "frappe"


def test_flat_view_reports_the_frappe_source() -> None:
    settings = _bench_with_erpnext_first()._to_flat_dict()
    assert settings["app_repo"] == "https://gitee.com/linxiansheng0409/frappe"
    assert settings["app_branch"] == "v16.51.0"


def test_writing_the_app_source_lands_on_the_frappe_entry() -> None:
    config = _bench_with_erpnext_first()
    config._apply_setting("app_repo", "https://gitee.com/linxiansheng0409/frappe-cn")
    config._apply_setting("app_branch", "v16.52.0")
    assert config.apps[1].repo == "https://gitee.com/linxiansheng0409/frappe-cn"
    assert config.apps[1].branch == "v16.52.0"
    assert config.apps[0].repo == "https://gitee.com/linxiansheng0409/erpnext"
