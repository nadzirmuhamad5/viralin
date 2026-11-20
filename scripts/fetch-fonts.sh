#!/usr/bin/env bash
# Unduh font caption (libass/ffmpeg fontsdir) → viralin-next/assets/caption-fonts/
# lalu verifikasi TTF + cetak nama family (untuk mencocokkan style ASS).
set -u
DIR=/home/z/my-project/viralin-next/assets/caption-fonts
mkdir -p "$DIR"

get() { # url out
  [ -s "$DIR/$2" ] && { echo "skip  $2 (sudah ada)"; return; }
  if curl -fsSL --max-time 90 -o "$DIR/$2" "$1"; then
    echo "ok    $2 ($(stat -c%s "$DIR/$2")B)"
  else
    echo "GAGAL $2 dari $1"
  fi
}

get https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf Anton-Regular.ttf
get https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf BebasNeue-Regular.ttf
get https://github.com/google/fonts/raw/main/ofl/archivoblack/ArchivoBlack-Regular.ttf ArchivoBlack-Regular.ttf
get https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf Montserrat-ExtraBold.ttf
get https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf Montserrat-Bold.ttf

echo "--- verifikasi magic TTF + family fontconfig:"
for f in "$DIR"/*.ttf; do
  [ -e "$f" ] || continue
  magic=$(head -c 4 "$f" | od -An -tx1 | tr -d ' \n')
  fam=$(fc-scan --format "%{family}" "$f" 2>/dev/null | head -1)
  case "$magic" in
    00010000|4F54544F) ok=TTF ;;
    *) ok="BUKAN-FONT($magic)" ;;
  esac
  echo "$(basename "$f") → $ok · family='$fam'"
done
