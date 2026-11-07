"""Verify the separately tracked 2.1.0 Search/SEO overlay files."""

import hashlib
import json
from pathlib import Path


root = Path(__file__).resolve().parents[1] / "release" / "headless-api-2.1.0-search-seo-overlay"
manifest = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))
expected = manifest["files"]
actual = {path.relative_to(root).as_posix() for path in root.rglob("*.php")}
if actual != set(expected):
    raise SystemExit(f"Overlay file list differs: expected={sorted(expected)}, actual={sorted(actual)}")

for name, digest in expected.items():
    content = (root / name).read_bytes().replace(b"\r\n", b"\n")
    if hashlib.sha256(content).hexdigest() != digest:
        raise SystemExit(f"Overlay hash mismatch: {name}")

print(f"CMS_OVERLAY_VERIFY PASS files={len(expected)} version={manifest['installed_plugin_version']}")
