"""Build a targeted overlay for the installed Headless API 2.1.0 files.

This is not a full WordPress plugin package. Deployment must verify each
installed file's original SHA-256 before replacing it.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "release" / "headless-api"
OUTPUT = ROOT / "artifacts" / "cms-search-hotfix" / "headless-api-2.1.0-search-seo-overlay.zip"

ORIGINAL_SHA256 = {
    "includes/Services/SearchService.php": "7997acfccabdfd855620efae058533cf038c8036d0a50bd98b46f1742f99c2f5",
    "includes/endpoints/class-search.php": "9904e7b972ea2fce879808de4d8bedfbe5b365bce8c0099e721feac53f41dcdb",
    "includes/endpoints/class-seo.php": "cfdba7648b7e9d5ffb829ad987864ce7ba2ed1557bb8f513a549a6ed0c2e17d8",
}


def entry(archive: ZipFile, name: str, data: bytes) -> None:
    info = ZipInfo(name, date_time=(2026, 10, 13, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    archive.writestr(info, data)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {}
    for name, original_hash in ORIGINAL_SHA256.items():
        data = (SOURCE / name).read_bytes().replace(b"\r\n", b"\n")
        payload[name] = {
            "data": data,
            "original_sha256": original_hash,
            "overlay_sha256": hashlib.sha256(data).hexdigest(),
        }

    manifest = {
        "kind": "targeted-file-overlay-not-full-plugin",
        "installed_plugin_version": "2.1.0",
        "files": {
            name: {key: value for key, value in details.items() if key != "data"}
            for name, details in payload.items()
        },
    }
    with ZipFile(OUTPUT, "w") as archive:
        for name in sorted(payload):
            entry(archive, name, payload[name]["data"])
        entry(archive, "overlay-manifest.json", (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode())

    with ZipFile(OUTPUT) as archive:
        for name in payload:
            assert hashlib.sha256(archive.read(name)).hexdigest() == payload[name]["overlay_sha256"]
    print(f"{OUTPUT} sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
