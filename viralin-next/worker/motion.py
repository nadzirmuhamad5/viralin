#!/usr/bin/env python3
"""Worker motion gaming: video low-res -> skor motion per detik (JSON).
Pakai OpenCV Dense Optical Flow (Farneback), CPU saja — tanpa GPU.
Dependensi (belum terpasang di VPS): pip install opencv-python-headless numpy.
Kalau cv2 tidak ada / video tidak bisa dibaca -> exit non-zero (pemanggil
fallback tanpa sinyal motion, pipeline tetap jalan).
Output: file JSON {"points": [{"time": detik, "score": float}, ...]}; log ke stderr."""
import argparse
import json
import sys


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, default=1.0, help="frame yang dianalisis per detik")
    a = ap.parse_args()

    try:
        import cv2
        import numpy as np
    except ImportError as e:
        print(f"[motion] opencv/numpy tidak tersedia: {e}", file=sys.stderr)
        raise SystemExit(2)

    cap = cv2.VideoCapture(a.video)
    if not cap.isOpened():
        print("[motion] video tidak bisa dibuka", file=sys.stderr)
        raise SystemExit(3)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    skip = max(1, int(round(fps / a.fps)))
    prev = None
    points = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % skip == 0:
            sec = idx / fps
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (128, 128))
            if prev is not None:
                flow = cv2.calcOpticalFlowFarneback(prev, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                points.append({"time": round(sec, 1), "score": round(float(np.mean(mag)), 3)})
            prev = gray
        idx += 1
    cap.release()
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"points": points}, f)
    print(f"[motion] {len(points)} titik motion -> {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
