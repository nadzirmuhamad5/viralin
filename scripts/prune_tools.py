#!/usr/bin/env python3
"""Prune kartu tool dari lib/tools.ts (hapus 14 tool per permintaan user)."""
import re
import pathlib
import sys

P = pathlib.Path("/home/z/my-project/viralin-next/lib/tools.ts")
DELETE = {
    "atur-manual", "highlight-bola", "transcript", "wa-story-hd", "brand-kit",
    "motion-graphic", "merge-video", "viral-konten", "ai-image", "prompt-gen",
    "music-gen", "dubbing", "voice-clone", "thumbnail",
}

src = P.read_text()
before = re.findall(r'\n    id: "([\w-]+)"', src)

for tid in sorted(DELETE):
    pat = re.compile(r'  \{\n    id: "%s".*?\n  \},\n' % re.escape(tid), re.S)
    if not pat.search(src):
        print(f"TIDAK KETEMU: {tid}")
        sys.exit(1)
    src = pat.sub("", src, count=1)

P.write_text(src)

after = re.findall(r'\n    id: "([\w-]+)"', src)
gone = [t for t in before if t not in after]
print(f"dulu {len(before)} kartu -> sisa {len(after)}")
print("dihapus:", ", ".join(gone))
print("sisa   :", ", ".join(after))
# sanity: kurung seimbang
print("kurung { =", src.count("{"), "} =", src.count("}"))
