<#
.SYNOPSIS
  Script automatizado de respaldo (backup) de la base de datos PostgreSQL de TiendaDelki.
.DESCRIPTION
  Genera un volcado completo de la base de datos en formato comprimido (.dump o .sql.gz),
  calcula su checksum criptográfico SHA-256 para validación de integridad y aplica una política
  de rotación y retención automática.
#>

param(
  [string]$BackupDir = "storage/backups",
  [int]$RetentionDays = 14,
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "TIENDADELKI: INICIANDO RESPALDO AUTOMATIZADO DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

# 1. Resolver ruta del directorio de backups
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$FullBackupDir = Join-Path $ProjectRoot $BackupDir
if (!(Test-Path $FullBackupDir)) {
  New-Item -ItemType Directory -Path $FullBackupDir -Force | Out-Null
}

# 2. Cargar variables de entorno desde .env si existe
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
  Write-Error "[ERROR] La variable DATABASE_URL no esta definida ni en el entorno ni en $EnvFile."
  exit 1
}

# 3. Parsear DATABASE_URL (postgresql://user:pass@host:port/dbname?schema=...)
$UriMatch = [regex]::Match($DbUrl, 'postgresql://(?<user>[^:]+)(:(?<pass>[^@]+))?@(?<host>[^:/]+)(:(?<port>\d+))?/(?<dbname>[^?]+)')
if (!$UriMatch.Success) {
  Write-Error "[ERROR] DATABASE_URL tiene un formato no reconocido."
  exit 1
}

$DbUser = $UriMatch.Groups["user"].Value
$DbPass = $UriMatch.Groups["pass"].Value
$DbHost = $UriMatch.Groups["host"].Value
$DbPort = if ($UriMatch.Groups["port"].Success) { $UriMatch.Groups["port"].Value } else { "5432" }
$DbName = $UriMatch.Groups["dbname"].Value

# 4. Localizar ejecutable pg_dump
$PgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (!$PgDumpCmd) {
  $FallbackPaths = @(
    "C:\Users\pc gaming\.postgres_bin\pgsql\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
  )
  foreach ($p in $FallbackPaths) {
    if (Test-Path $p) {
      $PgDumpCmd = $p
      break
    }
  }
}

if (!$PgDumpCmd) {
  Write-Error "[ERROR] No se encontro la herramienta pg_dump en el PATH ni en ubicaciones estandar."
  exit 1
}

# 5. Generar nombre de archivo con timestamp ISO
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFileName = "tiendadelki_${DbName}_${Timestamp}.dump"
$BackupFilePath = Join-Path $FullBackupDir $BackupFileName
$ChecksumFilePath = "${BackupFilePath}.sha256"

Write-Host "Target Host: ${DbHost}:${DbPort} | Base de datos: $DbName | Usuario: $DbUser" -ForegroundColor Yellow
Write-Host "Generando volcado binario custom [-Fc] en:" -ForegroundColor Yellow
Write-Host "  $BackupFilePath`n" -ForegroundColor White

# 6. Ejecutar pg_dump con credenciales en entorno
$env:PGPASSWORD = $DbPass
try {
  $dumpArgs = @(
    "-h", $DbHost,
    "-p", $DbPort,
    "-U", $DbUser,
    "-F", "c",
    "-b",
    "-v",
    "-f", $BackupFilePath,
    $DbName
  )

  & $PgDumpCmd @dumpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump finalizo con codigo de error $LASTEXITCODE"
  }
} finally {
  $env:PGPASSWORD = $null
}

# 7. Validar tamaño y generar Checksum SHA-256
$FileInfo = Get-Item $BackupFilePath
if ($FileInfo.Length -eq 0) {
  Remove-Item $BackupFilePath -Force
  Write-Error "[ERROR CRITICO] El archivo de respaldo se creo vacio."
  exit 1
}

$HashObj = Get-FileHash -Path $BackupFilePath -Algorithm SHA256
$HashString = "$($HashObj.Hash)  $BackupFileName"
Set-Content -Path $ChecksumFilePath -Value $HashString -Encoding utf8

$SizeMb = [math]::Round($FileInfo.Length / 1MB, 2)
Write-Host "[OK] Respaldo generado con exito:" -ForegroundColor Green
Write-Host "   Archivo: $BackupFileName" -ForegroundColor Green
Write-Host "   Tamano: $SizeMb MB" -ForegroundColor Green
Write-Host "   SHA-256: $($HashObj.Hash)" -ForegroundColor Green

# 8. Política de Retención y Rotación (Eliminar respaldos antiguos)
Write-Host "`nAplicando politica de retencion: $RetentionDays dias..." -ForegroundColor Cyan

$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
$OldFiles = Get-ChildItem -Path $FullBackupDir -Filter "tiendadelki_*.dump" | Where-Object { $_.LastWriteTime -lt $CutoffDate }

$DeletedCount = 0
foreach ($old in $OldFiles) {
  Remove-Item $old.FullName -Force
  $oldHash = "$($old.FullName).sha256"
  if (Test-Path $oldHash) {
    Remove-Item $oldHash -Force
  }
  $DeletedCount++
}
Write-Host "   Archivos antiguos purgados: $DeletedCount" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "RESPALDO COMPLETADO SATISFACTORIAMENTE" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan
