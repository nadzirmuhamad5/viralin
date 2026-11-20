#!/usr/bin/env python3
"""Uji 3 skenario anti-bot: (1) mp4 langsung tanpa cookies, (2) YouTube tanpa cookies
→ gagal dengan pesan baru, (3) YouTube + cookies.txt dummy → cek plumbing cookies."""
import json
import time
import urllib.request

BASE = "http://127.0.0.1:3000"


def post(path, body=None, files=None):
    if files:
        import uuid
        b = uuid.uuid4().hex[:8]
        boundary = "----b" + b
        (field, fname, fbytes) = files
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
            f"filename=\"{fname}\"\r\nContent-Type: text/plain\r\n\r\n"
        ).encode() + fbytes + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(BASE + path, body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    else:
        req = urllib.request.Request(BASE + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read())


def wait_job(jid, timeout=240):
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(3)
        j = get(f"/api/jobs/{jid}")
        if j.get("status") in ("done", "fail"):
            return j
    return get(f"/api/jobs/{jid}")


def show(label, j):
    print(f"\n[{label}] status={j.get('status')} err={(j.get('error') or '')[:170]}")
    for l in (j.get("logs") or [])[-6:]:
        print("   ·", l[:130])


# 1. regresi: mp4 langsung tanpa cookies
j = wait_job(post("/api/jobs", {"tool": "transcript", "inputs": {
    "source": "http://127.0.0.1:8080/e2e-ujian.mp4"}})["id"])
show("1 mp4 langsung (tanpa cookies)", j)

# 2. YouTube tanpa cookies → gagal + pesan baru
j = wait_job(post("/api/jobs", {"tool": "transcript", "inputs": {
    "source": "https://www.youtube.com/watch?v=jEeGL9svOWk"}})["id"])
show("2 YouTube tanpa cookies", j)

# 3. YouTube + cookies.txt dummy → cek plumbing
ck = (b"# Netscape HTTP Cookie File\n"
      b".youtube.com\tTRUE\t/\tTRUE\t1900000000\tVISITOR_INFO1_LIVE\tfakevalue\n"
      b".youtube.com\tTRUE\t/\tTRUE\t1900000000\tLOGGED_IN\tyes\n")
up = post("/api/upload", files=("file", "yt-cookies.txt", ck))
print("\nupload cookies →", up.get("uploadId"))
j = wait_job(post("/api/jobs", {"tool": "transcript", "inputs": {
    "source": "https://www.youtube.com/watch?v=jEeGL9svOWk",
    "cookies": up["uploadId"]}})["id"])
show("3 YouTube + cookies.txt dummy", j)
