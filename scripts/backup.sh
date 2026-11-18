#!/usr/bin/env bash
# Backup completo do banco (inclui logos e fotos). Uso: DATABASE_URL=... ./scripts/backup.sh
# Restaurar: pg_restore --clean --no-owner -d "$DATABASE_URL" arquivo.dump
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL}"
mkdir -p backups
f="backups/backup-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner "$DATABASE_URL" -f "$f"
ls -1t backups/*.dump | tail -n +31 | xargs -r rm -- # mantém os 30 mais recentes
echo "Backup salvo em $f"
