#!/usr/bin/env python3
"""Uji alur PASTE cookies: kirim isi cookies.txt sebagai teks mentah di inputs.cookies.
Verifikasi: log '[cookies] pakai cookies paste user', file paste-*.txt dibuat,
yt-dlp menerima format file (ekstraksi jalan, bukan error format cookies)."""
import json
import time
import urllib.request

BASE = "http://127.0.0.1:3000"
CK_PATH = "/home/z/my-project/viralin-next/data/uploads/manual-yt-cookies.txt"

with open(CK_PATH, encoding="utf-8") as f:
    pasted = f.read()  # simulasikan user paste isi file

req = urllib.request.Request(
    BASE + "/api/jobs",
    json.dumps({"tool": "transcript", "inputs": {
        "source": "https://www.youtube.com/watch?v=jEeGL9svOWk",
        "cookies": pasted,
    }}).encode(),
    {"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=60) as r:
    j = json.loads(r.read())
jid = j["id"]
print("job:", jid, "| bytes cookies terkirim:", len(pasted))

status = ""
for _ in range(40):
    time.sleep(4)
    with urllib.request.urlopen(f"{BASE}/api/jobs/{jid}", timeout=60) as r:
        j = json.loads(r.read())
    status = j["status"]
    if status in ("done", "fail"):
        break

print("status:", status)
print("error:", (j.get("error") or "")[:180])
print("--- log ---")
for l in (j.get("logs") or [])[-8:]:
    print(" ·", l[:120])
