#!/usr/bin/env python3
"""Remote worker yt-dlp — jalankan di komputer dengan IP residential (rumah/kantor).

Server Viralin memanggil worker ini sebagai fallback kalau YouTube memblokir
IP data center-nya. Worker mengunduh pakai IP rumahmu lalu mengirim file balik.

Pakai di mesin rumah (butuh python3 + yt-dlp terpasang):
    pip install yt-dlp
    python3 remote-worker.py            # port 8817, tanpa token
    VL_WORKER_TOKEN=rahasia python3 remote-worker.py

Di server, tulis di deploy/env lalu restart:
    export VL_REMOTE_WORKER=http://<ip-rumah>:8817
    export VL_WORKER_TOKEN=rahasia      # kalau worker pakai token
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8817
TOKEN = os.environ.get("VL_WORKER_TOKEN", "")
MAX_FILE = 500 * 1024 * 1024  # sama dengan batas server
YTDLP = shutil.which("yt-dlp") or "/home/z/my-project/.deps/bin/yt-dlp"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # log ringkas
        print(f"[worker] {fmt % args}", flush=True)

    def _reply(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/ping":
            return self._reply(200, b'{"ok":true}', "application/json")
        if u.path != "/fetch":
            return self._reply(404, b'{"error":"path tidak dikenal"}', "application/json")
        if TOKEN and self.headers.get("X-Worker-Token") != TOKEN:
            return self._reply(401, b'{"error":"token salah"}', "application/json")
        qs = urllib.parse.parse_qs(u.query)
        url = (qs.get("url") or [""])[0]
        if not url.startswith(("http://", "https://")):
            return self._reply(400, b'{"error":"url tidak valid"}', "application/json")
        print(f"[worker] unduh: {url}", flush=True)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        tmp.close()
        try:
            r = subprocess.run(
                [YTDLP, "--no-playlist", "-q", "--no-warnings",
                 "--max-filesize", str(MAX_FILE), "-o", tmp.name, url],
                capture_output=True, text=True, timeout=1800,
                env=dict(os.environ, PYTHONPATH=os.environ.get("VL_DEPS", "/home/z/my-project/.deps")))
            if r.returncode != 0 or os.path.getsize(tmp.name) == 0:
                err = (r.stderr or r.stdout or "").strip().splitlines()
                msg = next((l for l in reversed(err) if "ERROR" in l), err[-1] if err else "?")
                print(f"[worker] gagal: {msg[:160]}", flush=True)
                os.unlink(tmp.name)
                body = json.dumps({"error": msg[:400]}).encode()
                return self._reply(502, body, "application/json")
            size = os.path.getsize(tmp.name)
            print(f"[worker] ok: {size/1e6:.1f} MB → kirim balik", flush=True)
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(size))
            self.end_headers()
            with open(tmp.name, "rb") as f:
                while chunk := f.read(1 << 20):
                    self.wfile.write(chunk)
        except FileNotFoundError:
            body = json.dumps({"error": "yt-dlp tidak terpasang di worker — jalankan: pip install yt-dlp"}).encode()
            return self._reply(502, body, "application/json")
        except Exception as e:
            body = json.dumps({"error": f"worker error: {e}"}).encode()
            return self._reply(502, body, "application/json")
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)


if __name__ == "__main__":
    print(f"[worker] siap di 0.0.0.0:{PORT} (token: {'aktif' if TOKEN else 'TANPA token — jangan expose ke internet!'})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
