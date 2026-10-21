#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica shim + migrações e roda os testes de RLS.
# Uso: npm run test:db   (requer binários do PostgreSQL 15+ no PATH ou em /usr/lib/postgresql)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$DIR/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORTA="${PORTA:-54329}"
# O Postgres se recusa a rodar como root: nesse caso usa o usuário "postgres"
COMO=()
if [ "$(id -u)" = "0" ]; then chown postgres "$TMP"; COMO=(runuser -u postgres --); fi
trap '"${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

"${COMO[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORTA -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORTA" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$DIR/00_shim_supabase.sql"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  echo "→ migração $(basename "$m")"
  "${PSQL[@]}" -f "$m"
done
for t in "$DIR"/[1-9]*.sql; do
  echo "→ teste $(basename "$t")"
  "${PSQL[@]}" -f "$t"
done
echo "✔ Todos os testes de banco passaram"
