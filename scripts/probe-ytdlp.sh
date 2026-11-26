#!/usr/bin/env bash
# Probe yt-dlp per player_client YouTube: berapa format yang lolos bot-check dari IP ini?
# Gabungan dari 4 skrip probe lama (test-ytdlp-clients.sh, test-pot-clients.sh,
# probe-pot2.sh, test-pot-final.sh) — ringkas output-nya per client.
# Pakai: bash scripts/probe-ytdlp.sh URL [--clients "tv,android,web_embedded,default"] [--cookies FILE] [--pot] [--proxy URL]
#   --clients  daftar player_client (dipisah koma) yang diuji satu per satu
#   --cookies  file cookies.txt format Netscape (mis. viralin-next/data/uploads/manual-yt-cookies.txt)
#   --pot      aktifkan plugin PO-token: PYTHONPATH=.deps (plugin bgutil-ytdlp-pot-provider
#              dipasang ke .deps oleh restart-viralin.sh; server Deno-nya di :4416 —
#              nyalakan dulu lewat restart-viralin.sh, sama seperti skrip probe lama)
#   --proxy    proxy tambahan untuk yt-dlp
set -uo pipefail

BASE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
YTDLP="$BASE/.deps/bin/yt-dlp"

URL=""
CLIENTS="tv,android,web_embedded,default"
CK=""
POT=0
PROXY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --clients) CLIENTS="$2"; shift 2 ;;
    --cookies) CK="$2"; shift 2 ;;
    --pot)     POT=1; shift ;;
    --proxy)   PROXY="$2"; shift 2 ;;
    -h|--help) echo "Pakai: bash scripts/probe-ytdlp.sh URL [--clients \"tv,android,web_embedded,default\"] [--cookies FILE] [--pot] [--proxy URL]"; exit 0 ;;
    *) URL="$1"; shift ;;
  esac
done

if [ -z "$URL" ]; then
  echo "URL wajib. Pakai: bash scripts/probe-ytdlp.sh URL [--clients \"tv,android,web_embedded,default\"] [--cookies FILE] [--pot] [--proxy URL]" >&2
  exit 2
fi
if [ ! -x "$YTDLP" ]; then
  echo "yt-dlp tidak ada di $YTDLP — jalankan scripts/restart-viralin.sh dulu (pasang .deps)" >&2
  exit 2
fi

# Jalur plugin PO-token PERSIS seperti skrip lama (probe-pot2.sh/test-pot-final.sh):
# export PYTHONPATH=$BASE/.deps supaya yt-dlp menemukan plugin bgutil yang di-pip --target ke .deps.
[ "$POT" = 1 ] && export PYTHONPATH="$BASE/.deps"

EXTRA=()
[ -n "$CK" ] && EXTRA+=(--cookies "$CK")
[ -n "$PROXY" ] && EXTRA+=(--proxy "$PROXY")

echo "probe yt-dlp · url=$URL"
echo "clients=$CLIENTS · cookies=${CK:--} · pot=$POT · proxy=${PROXY:--} · PYTHONPATH=${PYTHONPATH:--}"
echo "---"

for c in ${CLIENTS//,/ }; do
  out="/tmp/yt-probe-$c.txt"
  "$YTDLP" --no-warnings --extractor-args "youtube:player_client=$c" \
    "${EXTRA[@]}" --list-formats "$URL" >"$out" 2>&1
  n=$(grep -cE "^[0-9]+\s+(mp4|webm|m4a|3gp)" "$out" || true)
  if [ "$n" -gt 0 ]; then
    echo "OK     $c : $n stream — contoh: $(grep -E '^[0-9]+\s+(mp4|webm|m4a|3gp)' "$out" | tail -2 | tr '\n' ' ' | cut -c1-90)"
    # saat --pot: tampilkan bukti PO-token bgutil terpakai (kalau server :4416 hidup)
    [ "$POT" = 1 ] && grep -o "pot:bgutil:http.*" "$out" | head -1 | sed 's/^/       ↳ /'
  else
    echo "KOSONG $c : $(grep -E "ERROR|WARNING|needs to be reloaded|player response" "$out" | head -1 | cut -c1-110)"
  fi
done

echo "---"
echo "selesai"
