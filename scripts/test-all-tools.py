#!/usr/bin/env python3
"""Uji E2E SEMUA 8 tool live Viralin lewat API produksi.
Urut dari yang ringan ke berat; tiap job di-poll sampai done/fail.
Hasil: scripts/e2e-all-results.json (relatif ke folder script ini) + tabel di stdout.
Daftar tool live saat ini (lihat viralin-next/lib/tools.ts): klip-ai, seamless-loop,
konten-tempel, ugc-affiliate, ragebait, motion-studio, title-optimizer, viral-tips."""
import json
import time
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:3000"
URL = "http://127.0.0.1:8080/e2e-ujian.mp4"
LOGO = "http://127.0.0.1:8080/logo.png"
TIMEOUT = 300

TESTS = [
    # (id, inputs, catatan)
    ("title-optimizer", {"judul": "mukbang seblak level 10", "platform": "tiktok"}, "LLM"),
    ("viral-tips", {"niche": "kuliner street food Jakarta"}, "LLM"),
    ("seamless-loop", {"source": URL, "start": "0", "dur": "4"}, "ffmpeg"),
    ("ragebait", {"topik": "penumpang angkot paling nyebelin"}, "LLM+tts+render"),
    ("motion-studio", {"mode": "manual", "judul": "UJI SEMUA TOOL", "bullets": "Poin satu\nPoin dua", "cta": "FOLLOW", "ilustrasi": "tidak", "narmode": "tidak"}, "ffmpeg"),
    ("klip-ai", {"source": URL}, "pipeline penuh"),
    ("konten-tempel", {"topik": "3 fakta singkat kopi susu gula aren", "voice": "id-ID-ArdiNeural", "bg": "gradient"}, "LLM+tts+render"),
    ("ugc-affiliate", {"source": URL, "produk": "Serum Vitamin C", "storyboard": "teks", "durasi": "30"}, "LLM+tts+render"),
]


def post(path, body):
    req = urllib.request.Request(BASE + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read())


def main():
    hasil = []
    print(f"mulai uji {len(TESTS)} tool @ {BASE}", flush=True)
    for tid, inputs, kind in TESTS:
        t0 = time.time()
        try:
            j = post("/api/jobs", {"tool": tid, "inputs": inputs})
            jid = j.get("id")
            if not jid:
                raise RuntimeError("POST tanpa id: " + json.dumps(j)[:200])
            status, err = "queued", ""
            while time.time() - t0 < TIMEOUT:
                time.sleep(3)
                try:
                    cur = get(f"/api/jobs/{jid}")
                except Exception:
                    continue  # dev restart — coba lagi
                status = cur.get("status", "?")
                err = cur.get("error") or ""
                if status in ("done", "fail"):
                    break
            dt = int(time.time() - t0)
            nf = len(cur.get("files") or [])
            nt = len(cur.get("texts") or [])
            nc = len(cur.get("clips") or [])
            hasil.append({"tool": tid, "status": status, "secs": dt, "files": nf, "texts": nt, "clips": nc, "error": err[:160]})
            mark = "✅" if status == "done" else "❌"
            print(f"{mark} {tid:16s} {status:5s} {dt:4d}s  files={nf} texts={nt} clips={nc} {err[:90]}", flush=True)
        except Exception as e:
            dt = int(time.time() - t0)
            hasil.append({"tool": tid, "status": "fail", "secs": dt, "files": 0, "texts": 0, "clips": 0, "error": str(e)[:160]})
            print(f"❌ {tid:16s} gagal {dt}s  {str(e)[:120]}", flush=True)
    ok = sum(1 for h in hasil if h["status"] == "done")
    print(f"\n=== HASIL: {ok}/{len(hasil)} tool done ===", flush=True)
    for h in hasil:
        if h["status"] != "done":
            print(f"  GAGAL {h['tool']}: {h['error']}", flush=True)
    with open(Path(__file__).resolve().parent / "e2e-all-results.json", "w") as f:
        json.dump(hasil, f, indent=1)


if __name__ == "__main__":
    main()
