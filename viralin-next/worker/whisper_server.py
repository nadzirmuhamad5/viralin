#!/usr/bin/env python3
"""Server whisper RESIDENT: model faster-whisper dimuat SEKALI saat boot, lalu
melayani banyak request lewat baris JSON di stdin → balasan satu baris JSON di stdout.

Protokol:
  stdout boot   : {"ready": true}  (atau {"ready": false, "error": "..."} lalu keluar)
  stdin request : {"id": 1, "wav": "/path/audio.wav"}
  stdout balasan: {"id": 1, "ok": true, "info": {language, duration, segments:[...]}}
                  {"id": 1, "ok": false, "error": "..."}
Progres transkripsi ke stderr (baris "[whisper] …"). Keluar otomatis setelah idle
--idle-exit detik supaya RAM model tidak dipegang selamanya.
"""
import argparse
import json
import os
import sys
import threading
import time
import wave

import numpy as np


def load_wav(path: str) -> tuple[np.ndarray, int]:
    """WAV 16-bit → float32 mono array (identik dengan worker/transcribe.py)."""
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw != 2:
        raise ValueError(f"harus PCM16 (sampwidth={sw}) — jalankan ffmpeg -ar 16000 dulu")
    data = np.frombuffer(raw, dtype=np.int16)
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1).astype(np.int16)
    return data.astype(np.float32) / 32768.0, sr


def reply(obj: dict) -> None:
    """Satu balasan = satu baris JSON, wajib flush (client baca per baris)."""
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default="id")
    ap.add_argument("--threads", type=int, default=2)
    ap.add_argument("--idle-exit", type=int, default=600, help="keluar setelah N detik idle")
    a = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as e:  # faster-whisper belum terpasang → beri tahu client, jangan error diam
        print(f"[whisperd] import faster_whisper gagal: {e}", file=sys.stderr)
        reply({"ready": False, "error": f"import faster_whisper gagal: {e}"})
        return

    t0 = time.time()
    print(f"[whisperd] memuat model {a.model} (int8, cpu {a.threads} thread)…", file=sys.stderr)
    try:
        model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=a.threads)
    except Exception as e:
        reply({"ready": False, "error": f"muat model gagal: {e}"})
        return
    print(f"[whisperd] model siap {time.time()-t0:.1f}s (resident, di-cache proses)", file=sys.stderr)
    reply({"ready": True})

    last_active = time.time()

    def watchdog() -> None:
        """Keluar kalau tidak ada request lebih lama dari idle-exit — bebas RAM."""
        while True:
            time.sleep(5)
            if time.time() - last_active > a.idle_exit:
                print("[whisperd] idle — worker keluar (akan respawn otomatis saat dipakai)", file=sys.stderr)
                os._exit(0)

    threading.Thread(target=watchdog, daemon=True).start()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        last_active = time.time()
        try:
            req = json.loads(line)
        except Exception as e:
            reply({"id": None, "ok": False, "error": f"request bukan JSON: {e}"})
            continue
        rid = req.get("id")
        try:
            audio, sr = load_wav(req["wav"])
            seg_iter, info = model.transcribe(
                audio,
                language=None if req.get("language") in (None, "", "auto") else req.get("language"),
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
                print(f"[whisper] segmen {len(segments)} sampai {s.end:.1f}s", file=sys.stderr, flush=True)
            reply(
                {
                    "id": rid,
                    "ok": True,
                    "info": {
                        "language": info.language or a.language,
                        "duration": round(len(audio) / sr, 2),
                        "segments": segments,
                    },
                },
            )
        except Exception as e:
            reply({"id": rid, "ok": False, "error": f"{type(e).__name__}: {e}"})


if __name__ == "__main__":
    main()
