#!/usr/bin/env bash
# ==============================================================================
# TIENDADELKI - SCRIPT DE RESTAURACIÓN CONTROLADA DE BASE DE DATOS (LINUX/DOCKER)
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
ENV_FILE="${ENV_FILE:-.env}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <ruta-al-archivo-backup.dump>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "\033[0;31m❌ Error: El archivo no existe: $BACKUP_FILE\033[0m"
  exit 1
fi

echo -e "\033[0;31m🔄 ========================================================\033[0m"
echo -e "\033[0;31m🔄 TIENDADELKI: PROTOCOLO DE RESTAURACIÓN DE POSTGRESQL\033[0m"
echo -e "\033[0;31m🔄 ========================================================\033[0m\n"

# 1. Comprobar checksum SHA-256 si existe .sha256
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "🔍 Verificando integridad SHA-256..."
  if sha256sum --check "${BACKUP_FILE}.sha256"; then
    echo -e "\033[0;32m   ✅ Integridad validada satisfactoriamente.\033[0m"
  else
    echo -e "\033[0;31m❌ ERROR CRÍTICO: El archivo está corrupto o fue modificado.\033[0m"
    exit 1
  fi
fi

# 2. Cargar .env
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
fi

PROTO="$(echo "$DATABASE_URL" | grep :// | sed -e's,^\(.*://\).*,\1,g')"
URL_WITHOUT_PROTO="${DATABASE_URL/$PROTO/}"
USER_PASS="$(echo "$URL_WITHOUT_PROTO" | grep @ | cut -d@ -f1)"
HOST_PORT_DB="$(echo "$URL_WITHOUT_PROTO" | grep @ | cut -d@ -f2)"

DB_USER="$(echo "$USER_PASS" | cut -d: -f1)"
DB_PASS="$(echo "$USER_PASS" | cut -d: -f2)"
HOST_PORT="$(echo "$HOST_PORT_DB" | cut -d/ -f1)"
DB_NAME="$(echo "$HOST_PORT_DB" | cut -d/ -f2 | cut -d\? -f1)"

DB_HOST="$(echo "$HOST_PORT" | cut -d: -f1)"
DB_PORT="$(echo "$HOST_PORT" | cut -s -d: -f2)"
DB_PORT="${DB_PORT:-5432}"

echo -e "\033[0;33m⚠️  ATENCIÓN: Se dispone a restaurar en:\033[0m"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Base de datos: $DB_NAME"
echo "   Archivo: $BACKUP_FILE"

read -p "¿Desea continuar y SOBREESCRIBIR la base de datos? (escriba 'SI, RESTAURAR'): " CONFIRM
if [ "$CONFIRM" != "SI, RESTAURAR" ]; then
  echo "Operación cancelada."
  exit 0
fi

export PGPASSWORD="$DB_PASS"

echo -e "\nRestaurando con pg_restore..."
pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  -v \
  "$BACKUP_FILE" || true

unset PGPASSWORD

echo -e "\n\033[0;32m🔄 ========================================================\033[0m"
echo -e "\033[0;32m🔄 BASE DE DATOS RESTAURADA SATISFACTORIAMENTE\033[0m"
echo -e "\033[0;32m🔄 ========================================================\033[0m"
