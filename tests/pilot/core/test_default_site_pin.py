"""A one-site bench must be reachable by IP, without a hosts entry.

Frappe serves a site by the request's Host header, so `http://<server-ip>:8000`
otherwise answers "<ip> does not exist" and the user has to edit their hosts
file before ERPNext opens at all.
"""

from __future__ import annotations

import json
from pathlib import Path

from pilot.core.site.login import SiteLogin, site_url
from tests.pilot.commands.test_commands import make_bench


def _add_site(bench, name: str) -> None:
    site = bench.sites_path / name
    site.mkdir(parents=True)
    (site / "site_config.json").write_text("{}")


def _common(bench) -> dict:
    return json.loads((bench.sites_path / "common_site_config.json").read_text())


def _bench(tmp_path: Path):
    bench = make_bench(tmp_path)
    bench.sites_path.mkdir(parents=True, exist_ok=True)
    return bench


def test_single_site_is_pinned_so_any_host_reaches_it(tmp_path: Path) -> None:
    bench = _bench(tmp_path)
    _add_site(bench, "yunyuji")

    bench.write_common_site_config()

    assert _common(bench)["default_site"] == "yunyuji"


def test_several_sites_are_left_to_host_routing(tmp_path: Path) -> None:
    bench = _bench(tmp_path)
    _add_site(bench, "one.localhost")
    _add_site(bench, "two.localhost")

    bench.write_common_site_config()

    assert "default_site" not in _common(bench)


def test_a_pin_to_a_removed_site_is_dropped_for_the_only_site(tmp_path: Path) -> None:
    bench = _bench(tmp_path)
    _add_site(bench, "yunyuji")
    (bench.sites_path / "common_site_config.json").write_text('{"default_site": "gone.localhost"}')

    bench.write_common_site_config()

    assert _common(bench)["default_site"] == "yunyuji"


def test_production_bench_does_not_pin(tmp_path: Path) -> None:
    bench = _bench(tmp_path)
    bench.config.production.enabled = True
    _add_site(bench, "yunyuji")

    bench.write_common_site_config()

    assert "default_site" not in _common(bench)


def test_site_url_can_use_the_host_the_panel_was_reached_on(tmp_path: Path) -> None:
    bench = _bench(tmp_path)

    assert site_url("yunyuji", {}, bench.config) == "http://yunyuji:8000"
    assert (
        site_url("yunyuji", {}, bench.config, host_override="192.168.1.102")
        == "http://192.168.1.102:8000"
    )


def test_only_the_pinned_site_is_served_on_any_host(tmp_path: Path) -> None:
    bench = _bench(tmp_path)
    _add_site(bench, "yunyuji")
    bench.write_common_site_config()

    assert SiteLogin(bench.site("yunyuji")).serves_any_host()

    _add_site(bench, "second.localhost")
    bench.write_common_site_config()

    assert not SiteLogin(bench.site("yunyuji")).serves_any_host()
