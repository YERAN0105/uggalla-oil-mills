#!/bin/bash
# ===========================================================================
# Uggalla Oil Mills — Weekly Database Backup (macOS)
# ---------------------------------------------------------------------------
# Double-click this file in Finder to back up the database into "backups".
# First time only, you must make it runnable — see docs/BACKUP.md (Mac).
# ===========================================================================

set -e
cd "$(dirname "$0")"

ENV_FILE=".backup-env"
BACKUP_DIR="backups"
RETENTION_DAYS=56   # 8 weeks

echo ""
echo "=== Uggalla Oil Mills - Database Backup ==="
echo ""

# --- 1. Is pg_dump installed? ---------------------------------------------
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is not installed. Do the setup in docs/BACKUP.md first."
  read -p "Press Enter to close"
  exit 1
fi

# --- 2. Read the connection string ----------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .backup-env file not found. See docs/BACKUP.md."
  read -p "Press Enter to close"
  exit 1
fi

DB_URL=$(grep -E '^SUPABASE_DB_URL[[:space:]]*=' "$ENV_FILE" | head -n1 \
         | sed -E 's/^SUPABASE_DB_URL[[:space:]]*=[[:space:]]*//' | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL is missing or empty in .backup-env."
  read -p "Press Enter to close"
  exit 1
fi

# --- 3. Make the backups folder -------------------------------------------
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y-%m-%d)
OUT="$BACKUP_DIR/uggalla-$DATE.dump"

# --- 4. Run the backup ----------------------------------------------------
echo "Backing up the database... this can take a minute, please wait."
echo ""
pg_dump --dbname="$DB_URL" --format=custom --no-owner --no-privileges --file="$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "SUCCESS! Backup saved to: $OUT ($SIZE)"

# --- 5. Delete backups older than 8 weeks ---------------------------------
find "$BACKUP_DIR" -name 'uggalla-*.dump' -type f -mtime +$RETENTION_DAYS -print -delete

echo ""
echo "All done. Tip: copy the 'backups' folder to Google Drive too."
read -p "Press Enter to close"
