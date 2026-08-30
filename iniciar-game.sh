#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não foi encontrado. Instale o Node.js 22 e tente novamente." >&2
  exit 1
fi
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-3000}"
URL="http://$HOST:$PORT"
if command -v xdg-open >/dev/null 2>&1; then (sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true) &
elif command -v open >/dev/null 2>&1; then (sleep 1; open "$URL" >/dev/null 2>&1 || true) &
fi
echo "Iniciando XBPNEUS Racing 3.5.0 em $URL"
node dist/standalone-server.mjs
