#!/bin/bash
# Verifica los 12 modelos del proxy con warmup optimizado

PROXY_URL="https://carbonato-proxy.vercel.app"
source /home/fsociety/.hermes/telegram.env 2>/dev/null

# 1. Warmup /chat/completions (despierta Vercel + proxy)
WARMUP_START=$(date +%s%N)
curl -s --max-time 35 -o /dev/null -X POST "$PROXY_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo1","messages":[{"role":"user","content":"OK"}]}'

# 2. Login admin (para Telegram, no necesario para chat)
COOKIE=$(curl -s -D - --max-time 15 -X POST "$PROXY_URL/api/admin-auth" \
  -d "user=admin&pass=carbonato2026" 2>/dev/null | grep -i "set-cookie" | sed 's/.*admin_sess=\([^;]*\).*/\1/')

MSG="📊 *Proxy Models Check*\n\n"
WARM=true

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  # Primer modelo después de warmup: más tiempo (cold upstream)
  if [ "$WARM" = true ]; then
    TIMEOUT=20
    WARM=false
  else
    TIMEOUT=8
  fi

  resp=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time $TIMEOUT \
    -X POST "$PROXY_URL/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"modelo$i\",\"messages\":[{\"role\":\"user\",\"content\":\"OK\"}]}")
  
  if [ "$resp" = "200" ]; then
    MSG+="✅ *modelo$i* OK\n"
  else
    MSG+="❌ *modelo$i* ($resp)\n"
  fi
done

MSG+="\n$(date)"

# Enviar Telegram
if [ -n "$COOKIE" ]; then
  curl -s --max-time 10 -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID&text=$(echo -e "$MSG" | jq -sRr @uri)&parse_mode=Markdown" >/dev/null 2>&1
fi

echo -e "$MSG"