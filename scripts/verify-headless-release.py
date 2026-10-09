"""Verify the frontend's plugin mirror against the pinned backend artifact."""

import hashlib
import json
import re
import zipfile
from pathlib import Path


root = Path(__file__).resolve().parents[1]
release = root / "release"
metadata = json.loads((release / "HEADLESS_API_CANDIDATE.json").read_text(encoding="utf-8"))
artifact = release / metadata["artifact"]
actual_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()
if actual_hash != metadata["sha256"]:
    raise SystemExit(f"Artifact checksum mismatch: {actual_hash}")

source = release / "headless-api"
files = {"headless-api/" + p.relative_to(source).as_posix(): p for p in source.rglob("*") if p.is_file()}


def normalized_source(path: Path) -> bytes:
    """Compare the canonical LF artifact with Windows CRLF checkouts."""
    return path.read_bytes().replace(b"\r\n", b"\n")


with zipfile.ZipFile(artifact) as archive:
    if set(archive.namelist()) != set(files):
        raise SystemExit("Artifact manifest differs from mirrored source")
    for name, path in files.items():
        if archive.read(name) != normalized_source(path):
            raise SystemExit(f"Artifact content differs from mirrored source: {name}")
    if archive.testzip() is not None:
        raise SystemExit("Artifact ZIP integrity check failed")

plugin = (source / "headless-api.php").read_text(encoding="utf-8")
for constant, expected in (
    ("TLU_HEADLESS_API_VERSION", metadata["plugin_version"]),
    ("TLU_HEADLESS_API_SCHEMA_VERSION", metadata["schema_version"]),
):
    match = re.search(r"define\(\s*'" + constant + r"'\s*,\s*'([^']+)'", plugin)
    if not match or match.group(1) != expected:
        raise SystemExit(f"Plugin {constant} mismatch")

print(f"HEADLESS_RELEASE_VERIFY PASS files={len(files)} sha256={actual_hash}")
