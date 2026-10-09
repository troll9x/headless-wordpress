"""Bounded read-only HTTP timing probe for staging and local production builds.

Examples:
  python scripts/benchmark-http.py --samples 3 https://dev.example.test/
  python scripts/benchmark-http.py --samples 1 http://localhost:3219/en
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from statistics import median


parser = argparse.ArgumentParser()
parser.add_argument("urls", nargs="+", help="Explicit URLs to fetch with GET")
parser.add_argument("--samples", type=int, default=3)
args = parser.parse_args()
if not 1 <= args.samples <= 10:
    parser.error("--samples must be between 1 and 10")


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, int(len(ordered) * fraction + 0.999) - 1))]


for url in args.urls:
    rows = []
    for _ in range(args.samples):
        with tempfile.TemporaryDirectory() as temporary:
            body = Path(temporary) / "body"
            header = Path(temporary) / "headers"
            result = subprocess.run(
                ["curl", "--no-progress-meter", "-sS", "-L", "--max-time", "30", "-o", str(body),
                 "-D", str(header), "-w", "%{json}", url],
                capture_output=True, text=True, check=False,
            )
            if result.returncode:
                rows.append({"error": result.stderr.strip()[:160]})
                continue
            metrics = json.loads(result.stdout)
            raw_header = header.read_text(encoding="latin-1", errors="replace")
            raw_body = body.read_bytes()[:2048]
            language = re.search(rb"<html[^>]*\blang=[\"']([^\"']+)", raw_body, flags=re.I)
            rows.append({
                "status": int(metrics["http_code"]),
                "dns_ms": round(metrics["time_namelookup"] * 1000),
                "tcp_ms": round((metrics["time_connect"] - metrics["time_namelookup"]) * 1000),
                "tls_ms": round(max(0, metrics["time_appconnect"] - metrics["time_connect"]) * 1000),
                "ttfb_ms": round(metrics["time_starttransfer"] * 1000),
                "total_ms": round(metrics["time_total"] * 1000),
                "bytes": int(metrics["size_download"]),
                "html_lang": language.group(1).decode("ascii", errors="replace") if language else None,
                "release": (re.findall(r"(?im)^x-tlu-release:\s*([^\r\n]+)", raw_header) or [None])[-1],
                "cache_control": re.findall(r"(?im)^cache-control:\s*([^\r\n]+)", raw_header),
                "cache_status": re.findall(r"(?im)^(?:x-cache|cf-cache-status|x-headless-cache):\s*([^\r\n]+)", raw_header),
            })
    times = [float(row["total_ms"]) for row in rows if "total_ms" in row]
    print(json.dumps({
        "url": url,
        "samples": rows,
        "p50_total_ms": round(median(times)) if times else None,
        "p95_total_ms": round(percentile(times, 0.95)) if times else None,
    }, ensure_ascii=False))
