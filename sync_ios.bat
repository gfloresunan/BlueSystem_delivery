@echo off
echo ========================================================
echo   BlueSystem Delivery - Sincronizacion iOS con GitHub
echo ========================================================
echo.
echo 1. Preparando cambios de flutter_client...
git add flutter_client/

echo 2. Creando commit de sincronizacion...
git commit -m "feat(flutter): sincronizar version iOS %date% %time%"

echo 3. Subiendo a GitHub main...
git push origin main

echo.
echo ========================================================
echo   Listo! GitHub Actions ha iniciado la compilacion L1.
echo   El archivo .ipa estara listo en ~8-9 minutos en:
echo   https://github.com/gfloresunan/BlueSystem_delivery/actions
echo ========================================================
echo.
pause
