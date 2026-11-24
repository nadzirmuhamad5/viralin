#!/bin/bash
# E2E auto-split klip-ai: video uji 3 bagian (TTS) → upload → job → verifikasi
# momen dicari per bagian (VL_PART_SECONDS=60 di server uji → bagian 1 menit).
set -e
cd /home/z/my-project/viralin-next
T=/tmp/split-test
rm -rf "$T" && mkdir -p "$T"

# 1. TTS tiga bagian (bahasa Indonesia, tiap bagian ±15-20 s ucapan)
z-ai tts -i "Selamat datang di video percobaan bagian pertama. Hari ini kita membahas resep rendang padang asli yang empuk dan meresap. Racikan bumbu secara perlahan agar aroma keluar sempurna. Masak dengan api kecil selama empat jam hingga kuah mengering." -o "$T/p1.wav" -f wav >/dev/null 2>&1
z-ai tts -i "Kita lanjut ke bagian dua tentang wisata pantai tersembunyi di Bali. Nyang Nyang punya pasir putih yang masih alami dan tenang. Datang pagi agar air masih jernih untuk snorkeling sederhana. Jangan lupa bawa air minum dan pelindung matahari." -o "$T/p2.wav" -f wav >/dev/null 2>&1
z-ai tts -i "Bagian ketiga bicara soal kebiasaan produktif pagi hari. Bangun sebelum matahari terbit memberi waktu tanpa gangguan. Tulis tiga prioritas terpenting sebelum buka ponsel. Konsistensi kecil selama tiga puluh hari mengubah arah hidup." -o "$T/p3.wav" -f wav >/dev/null 2>&1
for i in 1 2 3; do [ -s "$T/p$i.wav" ] || { echo "TTS p$i gagal"; exit 1; }; done
echo "TTS 3 bagian ok: $(du -h "$T"/p*.wav | awk '{print $1}' | tr '\n' ' ')"

# 2. Pad tiap bagian jadi 62 detik (agar 3 bagian × 60 d di server uji) lalu gabung
for i in 1 2 3; do
  ffmpeg -y -loglevel error -i "$T/p$i.wav" -af "apad=whole_dur=62" -ar 16000 -ac 1 "$T/g$i.wav"
done
ffmpeg -y -loglevel error -i "$T/g1.wav" -i "$T/g2.wav" -i "$T/g3.wav" -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1" "$T/full.wav"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/full.wav" | cut -d. -f1)
echo "audio gabungan: ${DUR}s"

# 3. Video uji (testsrc2) + mux
ffmpeg -y -loglevel error -f lavfi -i "testsrc2=size=640x360:rate=25:duration=$DUR" -i "$T/full.wav" \
  -c:v libx264 -preset ultrafast -crf 30 -c:a aac -b:a 64k -shortest "$T/uji.mp4"
echo "video uji: $(du -h "$T/uji.mp4" | awk '{print $1}')"

# 4. Upload + buat job
REF=$(curl -s -X POST http://127.0.0.1:3000/api/upload -F "file=@$T/uji.mp4;filename=uji-split.mp4" | python3 -c "import json,sys; print(json.load(sys.stdin)['ref'])")
echo "upload ref: $REF"
J=$(curl -s -X POST http://127.0.0.1:3000/api/jobs -H "Content-Type: application/json" \
  -d "{\"tool\":\"klip-ai\",\"inputs\":{\"source\":\"$REF\"}}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "job=$J"

# 5. Poll sampai selesai (whisper tiny × 3 bagian + render)
for i in $(seq 1 50); do
  sleep 12
  S=$(curl -s http://127.0.0.1:3000/api/jobs/$J | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  case "$S" in done|fail) break;; esac
done
echo "status: $S"
curl -s http://127.0.0.1:3000/api/jobs/$J | python3 -c "
import json, sys
j = json.load(sys.stdin)
for l in j['logs']:
    if any(k in l for k in ('bagian', 'momen', 'whisper', 'klip ', 'selesai', '❌')): print('LOG:', l[:120])
print('ERR:', (j.get('error') or '')[:200])
print('CLIPS:', [(c['start'], c['end']) for c in j.get('clips', [])])
"
