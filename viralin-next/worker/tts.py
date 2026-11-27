#!/usr/bin/env python3
"""Worker edge-tts: teks → suara neural (mp3). Log ke stderr."""
import argparse
import asyncio
import sys

import edge_tts


async def synth(voice: str, text_file: str, out: str, rate: str, pitch: str) -> None:
    with open(text_file, encoding="utf-8") as f:
        text = f.read().strip()
    if not text:
        raise SystemExit("teks kosong")
    print(f"[tts] {voice} · {len(text)} karakter · rate {rate} · pitch {pitch}", file=sys.stderr)
    cm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await cm.save(out)
    print("[tts] selesai", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="id-ID-ArdiNeural")
    ap.add_argument("--text-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--rate", default="+0%")
    ap.add_argument("--pitch", default="+0Hz")
    a = ap.parse_args()
    asyncio.run(synth(a.voice, a.text_file, a.out, a.rate, a.pitch))


if __name__ == "__main__":
    main()
