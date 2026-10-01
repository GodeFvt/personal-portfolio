#!/usr/bin/env sh
set -eu

: "${RESTORE_DIR:?Set RESTORE_DIR to one backup directory}"
: "${DATABASE_URL:?Set DATABASE_URL for the restore target}"
: "${LOCAL_STORAGE_DIR:=/app/data/media}"

test -f "$RESTORE_DIR/database.dump"
pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$RESTORE_DIR/database.dump"

if [ -f "$RESTORE_DIR/media.tar.gz" ]; then
  mkdir -p "$LOCAL_STORAGE_DIR"
  tar -C "$LOCAL_STORAGE_DIR" -xzf "$RESTORE_DIR/media.tar.gz"
fi

printf 'Restore completed from %s\n' "$RESTORE_DIR"
