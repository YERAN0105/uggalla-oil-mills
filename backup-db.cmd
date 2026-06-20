@echo off
REM ==========================================================================
REM  Double-click THIS file to back up the database.
REM  It simply launches backup-db.ps1 (the real script) in PowerShell.
REM ==========================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-db.ps1"
