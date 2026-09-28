# Script para iniciar Logcat en vivo filtrado por la app BlueSystem Delivery
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$pkg = "com.aistudio.delivery.djweq"

if (-not (Test-Path $adb)) {
    Write-Host "[ERROR] No se encontro adb.exe en $adb" -ForegroundColor Red
    exit 1
}

Write-Host "=== Monitoreo Logcat en Vivo - BlueSystem Delivery ===" -ForegroundColor Cyan
Write-Host "Dispositivo conectado:" -ForegroundColor Yellow
& $adb devices

$pidApp = (& $adb shell pidof -s $pkg).Trim()

if (-not $pidApp) {
    Write-Host "[AVISO] La app no se esta ejecutando actualmente. Esperando o monitoreando por tag/crash..." -ForegroundColor Yellow
    & $adb logcat -v time *:E *:W FLOTA_DEBUG:* AndroidRuntime:* CRASH:*
} else {
    Write-Host "[OK] Proceso detectado: PID $pidApp ($pkg)" -ForegroundColor Green
    Write-Host "Iniciando captura en vivo (Presiona Ctrl+C para detener)..." -ForegroundColor Cyan
    & $adb logcat --pid=$pidApp -v time
}
