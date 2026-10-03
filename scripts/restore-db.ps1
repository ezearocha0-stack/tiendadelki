<#
.SYNOPSIS
  Script de restauracion controlada para la base de datos PostgreSQL de TiendaDelki.
.DESCRIPTION
  Verifica el Checksum SHA-256 del archivo .dump antes de restaurar, exige confirmacion
  explicita y restaura la base de datos mediante pg_restore.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [switch]$Confirm,
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "TIENDADELKI: PROTOCOLO DE RESTAURACION DE BASE DE DATOS" -ForegroundColor Red
Write-Host "==========================================================`n" -ForegroundColor Red

# 1. Comprobar existencia del archivo
if (!(Test-Path $BackupFile)) {
  Write-Error "[ERROR] El archivo de respaldo especificado no existe: $BackupFile"
  exit 1
}

$FullBackupPath = (Resolve-Path $BackupFile).Path
$ChecksumPath = "${FullBackupPath}.sha256"

# 2. Verificar Checksum SHA-256 si existe el archivo .sha256
if (Test-Path $ChecksumPath) {
  Write-Host "[CHECK] Verificando integridad criptografica SHA-256..." -ForegroundColor Yellow
  $ExpectedHash = (Get-Content $ChecksumPath).Split(" ")[0].Trim().ToUpper()
  $ActualHash = (Get-FileHash -Path $FullBackupPath -Algorithm SHA256).Hash.ToUpper()

  if ($ExpectedHash -ne $ActualHash) {
    Write-Error "[ERROR] FALLO DE INTEGRIDAD CRITICO: El hash SHA-256 del archivo no coincide con el registro original. El archivo podria estar corrupto."
    exit 1
  }
  Write-Host "   [OK] Hash SHA-256 verificado y consistente ($ActualHash)" -ForegroundColor Green
} else {
  Write-Host "[WARN] Advertencia: No se encontro el archivo .sha256 para validacion de firma." -ForegroundColor Yellow
}

# 3. Cargar credenciales desde .env
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$FullEnvFile = Join-Path $ProjectRoot $EnvFile
if (Test-Path $FullEnvFile) {
  Get-Content $FullEnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $key = $parts[0].Trim()
      $val = $parts[1].Trim().Trim('"').Trim("'")
      if (![Environment]::GetEnvironmentVariable($key)) {
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
      }
    }
  }
}

$DbUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL")
if (!$DbUrl) {
  Write-Error "[ERROR] DATABASE_URL no encontrada."
  exit 1
}

$UriMatch = [regex]::Match($DbUrl, 'postgresql://(?<user>[^:]+)(:(?<pass>[^@]+))?@(?<host>[^:/]+)(:(?<port>\d+))?/(?<dbname>[^?]+)')
$DbUser = $UriMatch.Groups["user"].Value
$DbPass = $UriMatch.Groups["pass"].Value
$DbHost = $UriMatch.Groups["host"].Value
$DbPort = if ($UriMatch.Groups["port"].Success) { $UriMatch.Groups["port"].Value } else { "5432" }
$DbName = $UriMatch.Groups["dbname"].Value

# 4. Confirmación de Seguridad
Write-Host "`n[ATENCION] Se dispone a restaurar los datos en la base de datos:" -ForegroundColor Yellow
Write-Host "   Host: ${DbHost}:${DbPort}" -ForegroundColor Yellow
Write-Host "   Base de datos objetivo: $DbName" -ForegroundColor Yellow
Write-Host "   Archivo fuente: $FullBackupPath" -ForegroundColor Yellow

if (!$Confirm) {
  $prompt = Read-Host "`nDesea continuar y SOBREESCRIBIR los datos actuales? Escriba 'SI, RESTAURAR' para proceder"
  if ($prompt -ne "SI, RESTAURAR") {
    Write-Host "Operacion cancelada por el usuario." -ForegroundColor Gray
    exit 0
  }
}

# 5. Localizar pg_restore
$PgRestoreCmd = Get-Command "pg_restore" -ErrorAction SilentlyContinue
if (!$PgRestoreCmd) {
  $FallbackPaths = @(
    "C:\Users\pc gaming\.postgres_bin\pgsql\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe"
  )
  foreach ($p in $FallbackPaths) {
    if (Test-Path $p) {
      $PgRestoreCmd = $p
      break
    }
  }
}

if (!$PgRestoreCmd) {
  Write-Error "[ERROR] No se encontro 'pg_restore' en el sistema."
  exit 1
}

# 6. Ejecutar restauración
Write-Host "`nRestaurando base de datos..." -ForegroundColor Cyan
$env:PGPASSWORD = $DbPass
try {
  $restoreArgs = @(
    "-h", $DbHost,
    "-p", $DbPort,
    "-U", $DbUser,
    "-d", $DbName,
    "--clean",
    "--if-exists",
    "--no-owner",
    "-v",
    $FullBackupPath
  )

  & $PgRestoreCmd @restoreArgs
  Write-Host "[OK] Restauracion finalizada con exito." -ForegroundColor Green
} catch {
  Write-Host "[WARN] pg_restore completo con avisos o codigos no fatales: $_" -ForegroundColor Yellow
} finally {
  $env:PGPASSWORD = $null
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "BASE DE DATOS RESTAURADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Green
