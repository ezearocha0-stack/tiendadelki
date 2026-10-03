# Script para iniciar PostgreSQL local en Windows
$binPath = "C:\Users\pc gaming\.postgres_bin\pgsql\bin"
$dataPath = "C:\Users\pc gaming\.postgres_data"

if (-not (Test-Path "$dataPath\PG_VERSION")) {
    Write-Host "Inicializando cluster en $dataPath..."
    & "$binPath\initdb.exe" -D "$dataPath" -U postgres -E UTF8 --locale=C -A trust
}

# 1. Comprobar si ya está aceptando conexiones
& "$binPath\pg_isready.exe" -h 127.0.0.1 -p 5432 -q
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL ya se encuentra en ejecución en 127.0.0.1:5432."
    exit 0
}

# 2. Limpiar postmaster.pid huérfano si el proceso no existe
$pidFile = "$dataPath\postmaster.pid"
if (Test-Path $pidFile) {
    $firstLine = (Get-Content $pidFile -TotalCount 1).Trim()
    if ($firstLine -match '^\d+$') {
        $stalePid = [int]$firstLine
        $proc = Get-Process -Id $stalePid -ErrorAction SilentlyContinue
        if (-not $proc) {
            Write-Host "Detectado postmaster.pid huérfano (PID $stalePid). Limpiando bloqueo..."
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Iniciando PostgreSQL en 127.0.0.1:5432..."
Start-Process "$binPath\postgres.exe" -ArgumentList "-D", "`"$dataPath`"" -WindowStyle Hidden
Start-Sleep -Seconds 2

for ($i = 0; $i -lt 10; $i++) {
    & "$binPath\pg_isready.exe" -h 127.0.0.1 -p 5432 -q
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL iniciado correctamente y aceptando conexiones."
        exit 0
    }
    Start-Sleep -Seconds 1
}

& "$binPath\pg_isready.exe" -h 127.0.0.1 -p 5432

