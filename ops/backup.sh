#!/usr/bin/env sh
set -eu

: "${BACKUP_DIR:?Set BACKUP_DIR to an absolute backup directory}"
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${LOCAL_STORAGE_DIR:=/app/data/media}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR%/}/${timestamp}"
mkdir -p "$target"

pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$target/database.dump"
if [ -d "$LOCAL_STORAGE_DIR" ]; then
  tar -C "$LOCAL_STORAGE_DIR" -czf "$target/media.tar.gz" .
fi

printf '%s\n' "$timestamp" > "$target/created-at.txt"
printf 'Backup written to %s\n' "$target"
