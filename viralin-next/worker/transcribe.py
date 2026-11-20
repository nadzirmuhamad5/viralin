#!/usr/bin/env python3
"""Worker faster-whisper: audio wav 16k mono → segmen + kata ber-timestamp (JSON ke stdout).
Log progres ke stderr; baris stdout TERAKHIR = JSON utuh."""
import argparse
import json
import sys
import time
import wave

import numpy as np


def load_wav(path: str) -> tuple[np.ndarray, int]:
    """WAV 16-bit → float32 mono array (tanpa PyAV — lebih tahan banting)."""
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw != 2:
        raise SystemExit(f"harus PCM16 (sampwidth={sw}) — jalankan ffmpeg -ar 16000 dulu")
    data = np.frombuffer(raw, dtype=np.int16)
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1).astype(np.int16)
    return data.astype(np.float32) / 32768.0, sr


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default="id")
    ap.add_argument("--threads", type=int, default=2)
    a = ap.parse_args()

    t0 = time.time()
    print(f"[whisper] memuat model {a.model} (int8, cpu {a.threads} thread)…", file=sys.stderr)
    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=a.threads)
    print(f"[whisper] model siap {time.time()-t0:.1f}s → transkripsi…", file=sys.stderr)

    audio, sr = load_wav(a.audio)
    seg_iter, info = model.transcribe(
        audio,
        language=None if a.language in ("auto", "") else a.language,
        word_timestamps=True,
        beam_size=1,
        vad_filter=False,
    )
    segments = []
    for s in seg_iter:
        words = [
            {"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
            for w in (s.words or [])
        ]
        segments.append(
            {"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "words": words}
        )
        print(f"[whisper] segmen {len(segments)} sampai {s.end:.1f}s", file=sys.stderr)

    print(
        json.dumps(
            {
                "language": info.language or a.language,
                "duration": round(len(audio) / sr, 2),
                "segments": segments,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
