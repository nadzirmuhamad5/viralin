#!/usr/bin/env python3
"""Klasifikasi topik channel Issei Nugroho dari judul video yt-dlp."""
import re, statistics, collections

def load(path):
    rows = []
    for ln in open(path, encoding="utf-8"):
        ln = ln.strip()
        if not ln or ln.count("|") < 2:
            continue
        vid, title, views = ln.split("|", 2)
        try:
            v = int(views) if views.isdigit() else 0
        except ValueError:
            v = 0
        rows.append((vid, title, v))
    return rows

videos = load("/tmp/issei/videos.txt")
shorts = load("/tmp/issei/shorts.txt")

CATS = [
    ("GAMING (Bloodstrike/MLBB/Genshin/Honkai/dll)",
     r"bloodstrike|duo bloodstrike|mobile legends|mlbb|genshin|honkai|star rail|wuthering|zenless|hokai|arknights|game ini|game favorit|gacha|cbt1|duet night|valorant|pubg|efootball|fifa|enzo fernandez|zenpakuto|duo x"),
    ("ANIME — daftar/listicle & rekomendasi",
     r"rekomendasi anime|anime yang|anime anime|7 karakter|8 anime|6 cara|9 anime|20 alasan|7 cerita|karakter anime|anime isekai|anime dengan|anime terbaru|wajib|harus tonton|daftar"),
    ("ANIME — kritik animasi/studio/manga",
     r"animasi one punch|kesalahan animasi|studio|author|manga|adaptasi|season \d|episode|animation|ppt|konsistensi"),
    ("ANIME — pembahasan franchise (Naruto/AOT/dll)",
     r"naruto|boruto|uchiha|hokage|konoha|sakura|sasuke|one punch|saitama|attack on titan|aot|titan|bleach|one piece|luffy|haikyuu|jujutsu|jjk|gojo|demon slayer|kimetsu|tanjiro|fate|chainsaw|toriyama|dragon ball|goku|isekai"),
    ("INTERNET/POPINDO — sosok & kontroversi",
     r"suroso|timothy ronald|bigmo|boomer|netizen|kontroversi|wna|viral|cerita rakyat|sosok|fenomena|selebgram|tiktok|influencer|youb"),
    ("SOSIAL/POLITIK/BERITA",
     r"acab|pajak|rakyat|polisi|korupsi|hujat|indonesia|pemerintah|demo|buruh|presiden"),
    ("LAINNYA", r"a"),
]

def cat_of(t):
    tl = t.lower()
    for name, pat in CATS[:-1]:
        if re.search(pat, tl):
            return name
    return "LAINNYA"

def report(rows, label):
    print(f"== {label}: {len(rows)} item ==")
    cats = collections.defaultdict(list)
    for _, t, v in rows:
        cats[cat_of(t)].append(v)
    n = len(rows)
    for name, _ in CATS:
        vs = cats.get(name, [])
        if not vs:
            print(f"  {name:52s} 0 ({0:4.0f}%)  -")
            continue
        avg = sum(vs) / len(vs)
        mx = max(vs)
        print(f"  {name:52s} {len(vs):4d} ({100*len(vs)/n:4.0f}%)  avg={avg/1000:7.0f}k  max={mx/1000:6.0f}k")
    top = sorted(rows, key=lambda r: -(r[2] or 0))[:8]
    print("  --- top views:")
    for _, t, v in top:
        print(f"    {v/1000:7.0f}k  {t[:80]}")
    print()

report(videos, "VIDEO (tab Videos)")
report(shorts, "SHORTS (tab Shorts)")

# gabungan: berapa persen total konten menyentuh anime (kategori anime saja)
def is_anime(t):
    c = cat_of(t)
    return c.startswith("ANIME")

av = sum(1 for _, t, _ in videos if is_anime(t))
as_ = sum(1 for _, t, _ in shorts if is_anime(t))
print(f"Gabungan: video anime {av}/{len(videos)} ({100*av/len(videos):.0f}%), shorts anime {as_}/{len(shorts)} ({100*as_/len(shorts):.0f}%)")
