#!/usr/bin/env python3
"""Metrik kehalusan gerak: mean |diff| antar-frame berurutan di strip background
(menghindari area teks/karaoke/chip). Sawtooth/pulse kasar = std tinggi + lonjakan
periodik; zoom halus = diff rendah merata. Jalankan: python3 -I scripts/measure_stutter.py
"""
import subprocess, tempfile, os, sys
from PIL import Image
import numpy as np

CASES = [
    ("c41adf4b", "Remotion LAMA (sebelum fix — punya keluhan kedat-kedut)",
     "/home/z/my-project/viralin-next/data/c41adf4b/konten-viral.mp4"),
    ("1a774b73", "Ragebait ffmpeg (arsitektur baru)",
     "/home/z/my-project/viralin-next/data/1a774b73/rage-bait.mp4"),
]

for jid, label, path in CASES:
    if not os.path.exists(path):
        print(f"[{jid}] FILE TIDAK ADA: {path}"); continue
    dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
        "-of","csv=p=0",path],capture_output=True,text=True).stdout.strip() or 12)
    t0 = min(10.0, max(2.0, dur/3))
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(t0),"-i",path,
            "-frames:v","40","-vf","crop=w=iw*0.4:h=ih*0.08:x=iw*0.3:y=ih*0.05,scale=200:32",
            os.path.join(td,"f%03d.png")],check=True)
        frames = sorted(f for f in os.listdir(td) if f.endswith(".png"))
        diffs = []
        for a,b in zip(frames,frames[1:]):
            ia = np.asarray(Image.open(os.path.join(td,a)).convert("L"),dtype=np.int16)
            ib = np.asarray(Image.open(os.path.join(td,b)).convert("L"),dtype=np.int16)
            diffs.append(float(np.abs(ia-ib).mean()))
        d = np.array(diffs)
        print(f"[{jid}] {label}")
        print(f"    segmen {t0:.1f}s · {len(d)} transisi · mean={d.mean():.2f} · std={d.std():.2f} · max={d.max():.2f}")
