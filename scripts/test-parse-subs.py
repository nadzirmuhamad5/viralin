"""Simulasi parseSubs (port dari lib/pipeline.ts) untuk validasi pada file VTT asli."""
import re
import sys

def ts_sec(t: str) -> float:
    m = re.match(r"^(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)$", t.strip())
    if not m:
        return float("nan")
    h, mnt, s = m.groups()
    return (int(h) * 3600 if h else 0) + int(mnt) * 60 + float(s.replace(",", "."))

def parse_subs(path: str):
    lines = open(path, encoding="utf-8").read().replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out = []
    last_full = ""
    cue_re = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*"
        r"(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})"
    )
    i = 0
    while i < len(lines):
        m = cue_re.search(lines[i])
        if not m:
            i += 1
            continue
        start = ts_sec(m.group(1))
        end = ts_sec(m.group(2))
        body = []
        j = i + 1
        while j < len(lines) and lines[j].strip() and "-->" not in lines[j]:
            if not lines[j].strip().isdigit():
                body.append(lines[j].strip())
            j += 1
        i = j  # loop luar juga i+=... hati: di TS, i = j - 1 lalu i++ → i = j. Di sini sama.
        text = re.sub(r"<[^>]+>", "", " ".join(body))
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        max_k = min(len(last_full), len(text) - 1)
        k = 0
        for cand in range(max_k, 0, -1):
            if last_full[len(last_full) - cand:] == text[:cand]:
                k = cand
                break
        new_text = text[k:].strip()
        last_full = text
        if not new_text:
            continue
        out.append((round(start, 2), round(max(end, start + 0.5), 2), new_text))
    return out

if __name__ == "__main__":
    segs = parse_subs(sys.argv[1] if len(sys.argv) > 1 else "/tmp/substest/subs.id.vtt")
    print("segmen hasil parse:", len(segs))
    durs = [b - a for a, b, _ in segs]
    print("durasi total teks:", round(sum(durs), 1), "s | segmen 15-45s kandidat mungkin")
    print("contoh 6 pertama:")
    for a, b, t in segs[:6]:
        print(f"  {a}-{b}s: {t[:80]}")
    print("contoh 3 terakhir:")
    for a, b, t in segs[-3:]:
        print(f"  {a}-{b}s: {t[:80]}")
    # cek duplikat berurutan
    dups = sum(1 for i in range(1, len(segs)) if segs[i][2] == segs[i - 1][2])
    print("duplikat berurutan:", dups)
    words = sum(len(t.split()) for _, _, t in segs)
    print("total kata:", words)
