"""Download helper used by all data-preparation scripts.

Usage:  python scripts/download.py <url> <output_path>

Uses Python's urllib (curl's Windows TLS backend fails against svs.gsfc.nasa.gov).
Skips the download when the file already exists with the same size as the server copy.
"""
import os
import sys
import urllib.request


def download(url: str, out_path: str, force: bool = False) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "earth-is-speaking-data-prep/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        size = int(r.headers.get("Content-Length") or 0)
        modified = r.headers.get("Last-Modified")
        if not force and size and os.path.exists(out_path) and os.path.getsize(out_path) == size:
            print(f"[skip] {out_path} already downloaded ({size:,} bytes, server Last-Modified: {modified})")
            return modified
        tmp = out_path + ".part"
        got = 0
        with open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                got += len(chunk)
        os.replace(tmp, out_path)
        print(f"[ok] {url}\n     -> {out_path} ({got:,} bytes, server Last-Modified: {modified})")
        return modified


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    download(sys.argv[1], sys.argv[2])
