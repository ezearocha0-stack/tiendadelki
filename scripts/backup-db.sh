#!/usr/bin/env bash
# ==============================================================================
# TIENDADELKI - SCRIPT AUTOMATIZADO DE RESPALDO DE BASE DE DATOS (LINUX/DOCKER)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-storage/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
ENV_FILE="${ENV_FILE:-.env}"

echo -e "\033[0;36m📦 ========================================================\033[0m"
echo -e "\033[0;36m📦 TIENDADELKI: INICIANDO RESPALDO DE POSTGRESQL\033[0m"
echo -e "\033[0;36m📦 ========================================================\033[0m\n"

# 1. Cargar .env si existe
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "\033[0;31m❌ Error: DATABASE_URL no está definida.\033[0m"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# 2. Parsear DATABASE_URL
# Formato: postgresql://user:pass@host:port/dbname
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

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILENAME="tiendadelki_${DB_NAME}_${TIMESTAMP}.dump"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILEPATH="${BACKUP_FILEPATH}.sha256"

echo "Servidor: $DB_HOST:$DB_PORT | Base de datos: $DB_NAME"
echo "Destino: $BACKUP_FILEPATH"

export PGPASSWORD="$DB_PASS"

# 3. Ejecutar pg_dump
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILEPATH" \
  "$DB_NAME"

unset PGPASSWORD

if [ ! -s "$BACKUP_FILEPATH" ]; then
  echo -e "\033[0;31m❌ Error crítico: El archivo de respaldo se creó vacío.\033[0m"
  rm -f "$BACKUP_FILEPATH"
  exit 1
fi

# 4. Generar Checksum SHA-256
sha256sum "$BACKUP_FILEPATH" > "$CHECKSUM_FILEPATH"
HASH="$(cut -d ' ' -f 1 < "$CHECKSUM_FILEPATH")"
SIZE="$(du -h "$BACKUP_FILEPATH" | cut -f1)"

echo -e "\033[0;32m✅ Respaldo generado con éxito!\033[0m"
echo -e "   Tamaño: $SIZE"
echo -e "   SHA-256: $HASH"

# 5. Aplicar retención (eliminar archivos con más de RETENTION_DAYS días)
echo -e "\nAplicando política de retención ($RETENTION_DAYS días)..."
find "$BACKUP_DIR" -type f -name "tiendadelki_*.dump*" -mtime +"$RETENTION_DAYS" -exec rm -f {} +
echo -e "\033[0;32m✅ Rotación completada.\033[0m"

echo -e "\n\033[0;36m📦 ========================================================\033[0m"
echo -e "\033[0;36m📦 RESPALDO COMPLETADO SATISFACTORIAMENTE\033[0m"
echo -e "\033[0;36m📦 ========================================================\033[0m"
