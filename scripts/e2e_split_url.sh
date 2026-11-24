#!/bin/bash
# E2E auto-split klip-ai via URL http lokal (video uji 186 s, server uji bagian 60 d)
set -e
J=$(curl -s -X POST http://127.0.0.1:3000/api/jobs -H "Content-Type: application/json" \
  -d '{"tool":"klip-ai","inputs":{"source":"http://127.0.0.1:8081/uji-split.mp4"}}' | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "job=$J"
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
