#!/usr/bin/env bash
# Backup metadata riwayat job (data/jobs/*.json) → viralin-next/backup-data/jobs/
# lalu commit lokal (push kalau kredensial tersedia).
# Tujuan: riwayat job selamat dari recycle sandbox — data/ di-gitignore & hilang
# saat recycle; backup-data/ di-track git sehingga ikut repo.
# Catatan: file video/media TIDAK dibackup (besar) — hasil render re-render saja.
# Dipanggil watchdog tiap menit: bash /home/z/my-project/scripts/backup-data.sh
set -u
BASE=/home/z/my-project
APP=$BASE/viralin-next
SRC="$APP/data/jobs"
DST="$APP/backup-data/jobs"
[ -d "$SRC" ] || exit 0                     # server belum pernah jalan — tidak ada yang dibackup
mkdir -p "$DST"
CHANGED=0
for f in "$SRC"/*.json; do
  [ -e "$f" ] || break
  b="$DST/$(basename "$f")"
  if [ ! -e "$b" ] || ! cmp -s "$f" "$b"; then
    cp "$f" "$b"
    CHANGED=1
  fi
done
[ "$CHANGED" = "1" ] || exit 0              # tidak ada perubahan — selesai tanpa commit
cd "$APP" || exit 0
git add backup-data/jobs
if git diff --cached --quiet; then exit 0; fi
git commit -q -m "chore(data): backup metadata riwayat job ($(date '+%F %T'))" || exit 0
echo "[backup] $(date '+%F %T') commit riwayat: $(git rev-parse --short HEAD) ($(ls "$DST" | wc -l) job)"
# push best-effort — kalau remote belum punya kredensial, biarkan; agent push manual
git push -q origin main 2>/dev/null || true
