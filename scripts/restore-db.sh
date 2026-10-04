#!/usr/bin/env bash
# ==============================================================================
# TIENDADELKI - SCRIPT DE RESTAURACION CONTROLADA DE BASE DE DATOS (LINUX/DOCKER)
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
ENV_FILE="${ENV_FILE:-.env}"
CLEAN_MODE="${CLEAN_MODE:-false}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <ruta-al-archivo-backup.dump>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "\033[0;31m[ERROR] El archivo no existe: $BACKUP_FILE\033[0m"
  exit 1
fi

echo -e "\033[0;31m========================================================\033[0m"
echo -e "\033[0;31mTIENDADELKI: PROTOCOLO DE RESTAURACION DE POSTGRESQL\033[0m"
echo -e "\033[0;31m========================================================\033[0m\n"

# 1. Comprobar checksum SHA-256 si existe .sha256
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "Verificando integridad SHA-256..."
  if sha256sum --check "${BACKUP_FILE}.sha256"; then
    echo -e "\033[0;32m   Integridad validada satisfactoriamente.\033[0m"
  else
    echo -e "\033[0;31m[ERROR CRITICO]: El archivo esta corrupto o fue modificado.\033[0m"
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

echo -e "\033[0;33mATENCION: Se dispone a restaurar en:\033[0m"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Base de datos: $DB_NAME"
echo "   Archivo: $BACKUP_FILE"
if [ "$CLEAN_MODE" = "true" ]; then
  echo -e "   Modo: \033[0;31m--clean activado (Eliminara objetos existentes antes de restaurar)\033[0m"
else
  echo -e "   Modo: \033[0;32mSeguro (Sin --clean, apto para base de datos vacia/nueva)\033[0m"
fi

read -p "Desea continuar con la restauracion? (escriba 'SI, RESTAURAR'): " CONFIRM
if [ "$CONFIRM" != "SI, RESTAURAR" ]; then
  echo "Operacion cancelada."
  exit 0
fi

export PGPASSWORD="$DB_PASS"

RESTORE_FLAGS=(
  "-h" "$DB_HOST"
  "-p" "$DB_PORT"
  "-U" "$DB_USER"
  "-d" "$DB_NAME"
  "--no-owner"
  "--no-privileges"
  "-v"
)

if [ "$CLEAN_MODE" = "true" ]; then
  RESTORE_FLAGS+=("--clean" "--if-exists")
fi

echo -e "\nRestaurando con pg_restore..."
pg_restore "${RESTORE_FLAGS[@]}" "$BACKUP_FILE" || true

unset PGPASSWORD

echo -e "\n\033[0;32m========================================================\033[0m"
echo -e "\033[0;32mBASE DE DATOS RESTAURADA SATISFACTORIAMENTE\033[0m"
echo -e "\033[0;32m========================================================\033[0m"
