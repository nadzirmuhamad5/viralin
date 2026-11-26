#!/usr/bin/env python3
"""Artifact fix kedat-kedut komposisi Remotion ViralKonten (layer Remotion dihapus
di merged repo — artifact ini disimpan utk kalau layer Remotion dihidupkan lagi).

Akar masalah kedat-kedut (diukur + dibaca dari kode):
1. PointScene line bump: `0.026 * max(0, 1 - (frame-actStartF)/7)` — bg scale LONJAK
   instan 2.6% di awal tiap kata lalu luruh linear 7 frame = pola gergaji. Dgn TTS
   +12% (kata tiap ~6-9 frame) bg gak pernah diam → kedat-kedut.
   FIX: envelope sin (naik-turun mulus, amplitude setengah).
2. Karaoke: spring pop dikunci ke offset window (`frame - (k-off)*2`) → saat window
   geser, SEMUA kata loncat fase 2 frame sekaligus.
   FIX: pop dikunci ke waktu mulai kata absolut (w.s) → tiap kata pop sekali tepat
   saat diucapkan, tanpa loncatan fase.

Output: download/remotion-stutter-fix/{ViralKonten.tsx,kedat-kedut.patch}
"""
import difflib, subprocess, pathlib

OUT = pathlib.Path("/home/z/my-project/download/remotion-stutter-fix")
OUT.mkdir(parents=True, exist_ok=True)

orig = subprocess.run(
    ["git", "-C", "/home/z/my-project", "show", "bfb4e93:viralin-next/remotion/ViralKonten.tsx"],
    capture_output=True, text=True, check=True).stdout

BUMP_OLD = "    const bump = 0.026 * Math.max(0, 1 - (frame - actStartF) / 7); // denyut cepat lalu meluruh"
BUMP_NEW = ("    // FIX kedat-kedut: denyut dgn envelope sin (naik-turun mulus, tanpa lonjakan instan),\n"
            "    // amplitude setengah — bg tidak lagi bersawtooth tiap kata\n"
            "    const dt = frame - actStartF;\n"
            "    const bump = dt >= 0 && dt < 14 ? 0.013 * Math.sin((dt / 14) * Math.PI) : 0;")
KARA_OLD = "        const pop = spring({ frame: frame - (k - off) * 2, fps, config: { damping: 12, stiffness: 190, mass: 0.4 } });"
KARA_NEW = ("        // FIX kedat-kedut: pop dikunci ke waktu MULAI kata absolut (bukan offset window)\n"
            "        // → tidak ada loncatan fase 2-frame saat window geser\n"
            "        const pop = spring({ frame: frame - Math.max(0, Math.round((w.s - sc.start) * fps)), fps, config: { damping: 12, stiffness: 190, mass: 0.4 } });")

assert BUMP_OLD in orig, "marker bump tidak ketemu — kode berubah?"
assert KARA_OLD in orig, "marker karaoke tidak ketemu — kode berubah?"
fixed = orig.replace(BUMP_OLD, BUMP_NEW).replace(KARA_OLD, KARA_NEW)

(OUT / "ViralKonten.tsx").write_text(fixed)
diff = difflib.unified_diff(orig.splitlines(), fixed.splitlines(), "ViralKonten.tsx (lama)", "ViralKonten.tsx (fix)", lineterm="")
(OUT / "kedat-kedut.patch").write_text("\n".join(diff) + "\n")
print("OK →", OUT)
print("baris: orig=%d fixed=%d" % (len(orig.splitlines()), len(fixed.splitlines())))
