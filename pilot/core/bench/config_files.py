from __future__ import annotations

from typing import TYPE_CHECKING

from pilot.config.common_site_config import update_common_site_config

if TYPE_CHECKING:
    from pilot.config import S3Config
    from pilot.core.bench import Bench

# One process holds one client cache, so lite mode gives it a ceiling.
_LITE_CLIENT_CACHE_BYTES = 10 * 1024 * 1024


class BenchConfigFiles:
    def __init__(self, bench: "Bench") -> None:
        self.bench = bench

    def get_db_root_args(self, db_type: str) -> list[str]:
        if db_type == "postgres":
            postgres = self.bench.config.postgres
            return [
                "--db-root-username",
                postgres.admin_user,
                "--db-root-password",
                self.postgres_root_password,
            ]
        if db_type == "sqlite":
            return []
        mariadb = self.bench.config.mariadb
        return [
            "--db-root-username",
            mariadb.admin_user,
            "--db-root-password",
            mariadb.root_password,
        ]

    @property
    def postgres_root_password(self) -> str:
        return self.bench.config.postgres.root_password or "trust_auth"

    def set_maintenance_mode(self, enabled: bool) -> None:
        with update_common_site_config(self.bench.sites_path) as config:
            config["maintenance_mode"] = 1 if enabled else 0

    def sync_s3_credentials(self, s3_config: "S3Config") -> None:
        if not (self.bench.sites_path / "common_site_config.json").exists():
            return

        with update_common_site_config(self.bench.sites_path) as config:
            config["s3_access_key"] = s3_config.access_key
            config["s3_bucket"] = s3_config.bucket
            config["s3_secret_key"] = s3_config.secret_key
            config["s3_provider"] = s3_config.provider
            config["s3_region"] = s3_config.region

    def write_common_site_config(self) -> None:
        redis = self.bench.config.redis
        redis_cache = f"redis://localhost:{redis.cache_port}"
        with update_common_site_config(self.bench.sites_path) as config:
            config.update(
                {
                    "redis_cache": redis_cache,
                    "redis_queue": f"redis://localhost:{redis.queue_port}",
                    "redis_socketio": redis_cache,
                    "socketio_port": self.bench.realtime_port,
                    "webserver_port": self.bench.config.http_port,
                    "socketio_backend": self.bench.config.socketio_backend,
                    "monitor": True,
                }
            )
            if self.bench.is_lite_mode:
                config["client_cache_max_bytes"] = _LITE_CLIENT_CACHE_BYTES
            else:
                config.pop("client_cache_max_bytes", None)
            self._sync_default_site(config)

    def _sync_default_site(self, config: dict) -> None:
        """Pin the dev server to the only site, the way `bench use` does.

        Frappe picks the site from the Host header. A server reached by IP sends
        the IP as Host, so every request 404s with "<ip> does not exist" until
        someone edits their hosts file. With one site there is nothing to choose:
        pinning it serves that site for any Host. With several sites a pin would
        make every address resolve to the same one, so Host routing decides and
        the pin is removed.
        """
        if self.bench.config.production.enabled:
            return
        sites = [site.config.name for site in self.bench.sites()]
        if len(sites) == 1:
            config["default_site"] = sites[0]
        else:
            config.pop("default_site", None)
