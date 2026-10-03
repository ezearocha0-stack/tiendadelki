# Script para detener PostgreSQL local en Windows
$binPath = "C:\Users\pc gaming\.postgres_bin\pgsql\bin"
$dataPath = "C:\Users\pc gaming\.postgres_data"

Write-Host "Deteniendo PostgreSQL..."
& "$binPath\pg_ctl.exe" -D "$dataPath" stop -m fast
