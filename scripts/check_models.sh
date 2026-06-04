#!/bin/bash
# Verifica los 12 modelos del proxy y manda resultados por Telegram

PROXY_URL="https://carbonato-proxy.vercel.app"
source /home/fsociety/.hermes/telegram.env 2>/dev/null

# Warmup: despertar Vercel
curl -s --max-time 30 -o /dev/null -X POST "$PROXY_URL/api/admin-auth" \
  -d "user=admin&pass=carbonato2026" >/dev/null 2>&1
sleep 2

# Login de verdad + cookie
COOKIE=$(curl -s -D - -X POST "$PROXY_URL/api/admin-auth" \
  -d "user=admin&pass=carbonato2026" 2>/dev/null | grep -i "set-cookie" | sed 's/.*admin_sess=\([^;]*\).*/\1/')

if [ -z "$COOKIE" ]; then
  MSG="❌ Falló login admin - cookie no obtenida"
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID&text=$MSG" >/dev/null 2>&1
  echo "$MSG"
  exit 1
fi

MSG="📊 *Verificación de Modelos Proxy*\n\n"
FAILED=""

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  model="modelo$i"
  # Primer intento
  resp=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 \
    -X POST "$PROXY_URL/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Cookie: admin_sess=$COOKIE" \
    -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"OK\"}]}")
  
  # Si falla, reintentar (puede ser cold start)
  if [ "$resp" != "200" ]; then
    sleep 1
    resp=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 \
      -X POST "$PROXY_URL/chat/completions" \
      -H "Content-Type: application/json" \
      -H "Cookie: admin_sess=$COOKIE" \
      -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"OK\"}]}")
  fi

  if [ "$resp" = "200" ]; then
    MSG+="✅ *$model* OK\n"
  else
    MSG+="❌ *$model* ($resp)\n"
    FAILED+="$model "
  fi
done

MSG+="\n$(date)\n"
if [ -n "$FAILED" ]; then
  MSG+="Fallaron: $FAILED"
fi

# Enviar Telegram
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID&text=$(echo -e "$MSG" | jq -sRr @uri)&parse_mode=Markdown" >/dev/null 2>&1

echo -e "$MSG"