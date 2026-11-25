#!/usr/bin/env python3
"""Replika debugging: whisper ulang audio job ragebait → replika alignScenes → bounds."""
import json, subprocess, sys, re

F = "/home/z/my-project/viralin-next/data/ca79a053/konten-viral.mp4"
WAV = "/tmp/rage-debug.wav"
DEPS = "/home/z/my-project/.deps"

subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", F, "-vn", "-ac", "1", "-ar", "16000", WAV], check=True)
r = subprocess.run(
    [sys.executable, "/home/z/my-project/viralin-next/worker/transcribe.py", WAV,
     "--model", "small", "--language", "id", "--threads", "2"],
    capture_output=True, text=True, env={"PYTHONPATH": DEPS, "HF_HOME": "/home/z/my-project/.cache/huggingface", "PATH": "/usr/bin:/bin:/usr/local/bin"},
)
if r.returncode != 0:
    print("WHISPER FAIL:", r.stderr[-500:]); sys.exit(1)
info = json.loads(r.stdout)
print("== SEGMENTS:")
for s in info["segments"]:
    print(f"  [{s['start']:.2f}→{s['end']:.2f}] {s['text'][:70]}")
words = [w for s in info["segments"] for w in (s.get("words") or [])]
print(f"== {len(words)} kata; 8 pertama:", [(w["word"], round(w["start"],1), round(w["end"],1)) for w in words[:8]])

# replika alignScenes (lib/viral.ts)
texts = ["3 PENUMPANG ANGKOT GILA",
         "lu bayar penuh tapi dipaksa maju ke belakang",
         "nongkrong di kursi depan sampe penumpang ngos ngosan",
         "nge hon pelan terus sampe driver bingung mau jalan atau nggak",
         "LIKE SEKARANG"]
def kata(t): return [k for k in re.sub(r"[^\w\s]", " ", t.lower(), flags=re.UNICODE).split() if k]
counts = [len(kata(t)) for t in texts]
totalKata = sum(counts) or 1
W = len(words)
dur = info["duration"] + 0.8
segEnds = [s["end"] for s in info["segments"]]
print("== counts:", counts, "| totalDur:", round(dur, 2), "| segEnds:", [round(x, 2) for x in segEnds])
ends, cum = [], 0
for i, c in enumerate(counts):
    cum += c
    idx = min(W - 1, max(0, round(cum / totalKata * W) - 1))
    end = words[idx]["end"]
    best = 1e9; snapped = False
    for se in segEnds:
        d = abs(se - end)
        if d < best and d <= 2.5:
            best = d; end = se; snapped = True
    ends.append((end, snapped))
    print(f"  scene {i}: est_end={words[idx]['end']:.2f} → {end:.2f} snap={snapped}")
prev = 0; bounds = []
for i, (e, _) in enumerate(ends):
    end = max(prev + 0.4, min(e, dur))
    bounds.append((round(prev, 2), round(end, 2)))
    prev = end
bounds[-1] = (bounds[-1][0], round(max(prev, dur), 2))
print("== BOUNDS:", bounds)
