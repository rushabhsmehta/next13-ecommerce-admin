#!/bin/sh
set -eu

ADMIN_URL="${ADMIN_APP_URL:-https://admin.aagamholidays.com}"
WORKER_TOKEN="${WHATSAPP_WORKER_TOKEN:-}"

if [ -z "$WORKER_TOKEN" ]; then
  echo "[whatsapp-cron] Missing WHATSAPP_WORKER_TOKEN" >&2
  exit 1
fi

case "$ADMIN_URL" in
  http://*|https://*) TARGET_URL="$ADMIN_URL" ;;
  *) TARGET_URL="https://${ADMIN_URL}" ;;
esac

ENDPOINT="${TARGET_URL%/}/api/internal/whatsapp/campaign-worker"

echo "[whatsapp-cron] Triggering ${ENDPOINT} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

HTTP_CODE=$(curl -sS -o /tmp/whatsapp-cron-response.json -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${WORKER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')

cat /tmp/whatsapp-cron-response.json
echo ""

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "[whatsapp-cron] Worker returned HTTP ${HTTP_CODE}" >&2
  exit 1
fi

echo "[whatsapp-cron] Done"
