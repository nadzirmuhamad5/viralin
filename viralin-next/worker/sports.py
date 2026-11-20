#!/usr/bin/env python3
"""Deteksi puncak energi audio (sorak/gol/ledakan) untuk highlight bola.
Input wav 16k mono pcm16 (hasil ffmpeg). Output stdout: JSON [{start,end,score}]."""
import argparse
import array
import json
import math
import wave


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("wav")
    ap.add_argument("--count", type=int, default=3)
    ap.add_argument("--seglen", type=float, default=12.0)
    a = ap.parse_args()

    with wave.open(a.wav, "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        raw = array.array("h")
        raw.frombytes(w.readframes(n))
        if w.getnchannels() > 1:
            raw = raw[:: w.getnchannels()]

    dur = n / max(sr, 1)
    hop = 0.25  # resolusi energi 250ms
    win = int(sr * hop)
    frames = []
    for i in range(0, len(raw) - win, win):
        chunk = raw[i : i + win]
        rms = math.sqrt(sum(x * x for x in chunk) / len(chunk))
        frames.append(rms)
    if not frames:
        print(json.dumps([]))
        return

    # median sebagai baseline → skor = rasio puncak
    srt = sorted(frames)
    med = srt[len(srt) // 2] or 1.0
    # pilih puncak: jarak minimum = seglen
    order = sorted(range(len(frames)), key=lambda i: frames[i], reverse=True)
    picked: list[int] = []
    for i in order:
        if any(abs(i - j) * hop < a.seglen for j in picked):
            continue
        picked.append(i)
        if len(picked) >= a.count:
            break
    picked.sort()
    out = []
    for i in picked:
        start = max(0.0, i * hop - 1.0)
        end = min(dur, start + a.seglen)
        score = max(1.0, min(9.9, frames[i] / med))
        out.append({"start": round(start, 2), "end": round(end, 2), "score": round(score, 1)})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
