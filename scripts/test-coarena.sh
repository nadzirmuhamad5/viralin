#!/usr/bin/env bash
# Tes API Coarena utk Viralin — key dibaca dari viralin-next/.env.local (di-gitignore).
# JANGAN pernah echo key ke output.
set -u
cd /home/z/my-project/viralin-next
set -a; . ./.env.local; set +a
BASE="${COARENA_BASE_URL:-https://coarena.ai/api/v1}"

echo "== 1. daftar model =="
MODELS=$(curl -s --max-time 20 "$BASE/models" -H "Authorization: Bearer $COARENA_API_KEY")
echo "$MODELS" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    ids=[m.get('id') for m in d.get('data',[])]
    print('total model:',len(ids))
    want={'deepseek-v4-1-flash-1017','gemini-3-8-flash','gpt-6-luna'}
    print('dicari  ->', sorted(want))
    print('cocok   ->', sorted(w & set(ids)) if (w:=want) else [])
except Exception as e:
    print('bentuk tak dikenal:', str(sys.stdin)[:300] if False else e)
"
echo "$MODELS" | head -c 300; echo; echo

chat() { # $1=model $2=content $3=max_tokens
  curl -s --max-time 90 "$BASE/chat/completions" \
    -H "Authorization: Bearer $COARENA_API_KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$1\",\"messages\":[{\"role\":\"user\",\"content\":$2}],\"max_tokens\":$3}"
}
show() { python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    m=d.get('choices',[{}])[0].get('message') or {}
    c=m.get('content') or m.get('reasoning_content') or ''
    print('OK' if c else 'EMPTY', '| keys:', sorted(k for k,v in m.items() if v), '| isi:', str(c)[:100].replace(chr(10),' '))
except Exception as e: print('PARSE-ERR:', e)
"; }

echo "== 2. chat sanity — 3 model =="
for M in deepseek-v4-1-flash-1017 gemini-3-8-flash gpt-6-luna; do
  printf '%-28s ' "$M"
  chat "$M" '"Balas tepat satu kata: siap"' 512 | show
done
echo

echo "== 3. JSON-mode (prompt motion-studio, model default $COARENA_MODEL) =="
SYS='Kamu penulis konten short-video viral Indonesia. Susun struktur Motion Studio dari topik. Balas HANYA JSON valid tanpa penjelasan: {"judul":"HOOK KAPITAL maks 40 karakter", "bullets":["3-5 poin pendek maks 60 karakter"], "cta":"CTA maks 30 karakter"}.'
PR='Topik/niche: tips hemat belanja bulanan buat mahasiswa'
printf -v BODY '{"model":"%s","messages":[{"role":"system","content":%s},{"role":"user","content":%s}],"max_tokens":2500,"temperature":0.8}' "$COARENA_MODEL" "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$SYS")" "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$PR")"
curl -s --max-time 120 "$BASE/chat/completions" \
  -H "Authorization: Bearer $COARENA_API_KEY" -H "Content-Type: application/json" \
  -d "$BODY" > /tmp/coarena-json-test.json
python3 -c "
import json,re
d=json.load(open('/tmp/coarena-json-test.json'))
m=d.get('choices',[{}])[0].get('message') or {}
c=m.get('content') or m.get('reasoning_content') or ''
print('field isi:', 'content' if m.get('content') else ('reasoning_content' if m.get('reasoning_content') else '?'), '| id:', d.get('id',''))
mm=re.search(r'\{[\s\S]*\}', c)
j=json.loads(mm.group(0)) if mm else None
print('judul:', j and j.get('judul'))
print('bullets:', len(j.get('bullets',[])) if j else 0, '| contoh:', (j and j.get('bullets',[])[:2]))
print('cta:', j and j.get('cta'))
" 2>&1
echo

echo "== 4. POST /feedback (rate reply) — pakai request_id =="
MSGID=$(python3 -c "
import json
d=json.load(open('/tmp/coarena-json-test.json'))
print(d.get('id') or '')")
for BODY in "{\"request_id\":\"$MSGID\",\"rating\":5}" "{\"request_id\":\"$MSGID\",\"rating\":1}"; do
  R=$(curl -s -w "|HTTP:%{http_code}" --max-time 20 "$BASE/feedback" \
    -H "Authorization: Bearer $COARENA_API_KEY" -H "Content-Type: application/json" -d "$BODY")
  echo "body=$(echo "$BODY" | head -c 45)... → $(echo "$R" | head -c 220)"; echo
done
