# ===========================================================================
# Uggalla Oil Mills — Weekly Database Backup (Windows)
# ---------------------------------------------------------------------------
# This downloads a full copy of the database into the "backups" folder and
# deletes copies older than 8 weeks. You normally don't run this file directly
# — double-click "backup-db.cmd" instead, which launches this.
# Full instructions: docs/BACKUP.md
# ===========================================================================

$ErrorActionPreference = "Stop"

# Always work from this script's own folder, so it works no matter where it's
# launched from.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$envFile       = Join-Path $root ".backup-env"
$backupDir     = Join-Path $root "backups"
$retentionDays = 56   # 8 weeks

Write-Host ""
Write-Host "=== Uggalla Oil Mills - Database Backup ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Is pg_dump installed? ----------------------------------------------
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "ERROR: pg_dump is not installed (or not on your PATH)." -ForegroundColor Red
    Write-Host "Do the one-time setup in docs/BACKUP.md first." -ForegroundColor Yellow
    Read-Host "`nPress Enter to close"
    exit 1
}

# --- 2. Read the connection string from .backup-env ------------------------
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: Could not find the .backup-env file next to this script." -ForegroundColor Red
    Write-Host "Create it by copying .backup-env.example - see docs/BACKUP.md." -ForegroundColor Yellow
    Read-Host "`nPress Enter to close"
    exit 1
}

$dbUrl = $null
foreach ($line in Get-Content $envFile) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
    if ($trimmed -match '^SUPABASE_DB_URL\s*=\s*(.+)$') {
        $dbUrl = $matches[1].Trim().Trim('"')
    }
}

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "ERROR: SUPABASE_DB_URL is missing or empty in .backup-env." -ForegroundColor Red
    Read-Host "`nPress Enter to close"
    exit 1
}

# --- 3. Make sure the backups folder exists --------------------------------
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# --- 4. Run the backup -----------------------------------------------------
$date    = Get-Date -Format "yyyy-MM-dd"
$outFile = Join-Path $backupDir "uggalla-$date.dump"

Write-Host "Backing up the database... this can take a minute, please wait." -ForegroundColor Gray
Write-Host ""

# --format=custom  -> compact file, restored later with pg_restore
# --no-owner / --no-privileges -> makes the dump easy to restore anywhere
& $pgDump.Source --dbname=$dbUrl --format=custom --no-owner --no-privileges --file=$outFile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Backup failed (pg_dump exit code $LASTEXITCODE)." -ForegroundColor Red
    Write-Host "Check your internet, and the SUPABASE_DB_URL in .backup-env." -ForegroundColor Yellow
    Read-Host "`nPress Enter to close"
    exit 1
}

$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Host "SUCCESS! Backup saved to:" -ForegroundColor Green
Write-Host "   $outFile  ($sizeMB MB)" -ForegroundColor Green

# --- 5. Delete backups older than 8 weeks ----------------------------------
$cutoff = (Get-Date).AddDays(-$retentionDays)
$old = Get-ChildItem $backupDir -Filter "uggalla-*.dump" | Where-Object { $_.LastWriteTime -lt $cutoff }
if ($old) {
    Write-Host ""
    Write-Host "Cleaning up backups older than 8 weeks:" -ForegroundColor Gray
    foreach ($f in $old) {
        Remove-Item $f.FullName -Force
        Write-Host "   deleted $($f.Name)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "All done. Tip: copy the 'backups' folder to Google Drive too," -ForegroundColor Cyan
Write-Host "so your backups survive even if this computer is lost." -ForegroundColor Cyan
Read-Host "`nPress Enter to close"
