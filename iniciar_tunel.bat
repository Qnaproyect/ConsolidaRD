@echo off
setlocal enabledelayedexpansion
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"

echo [ConsolidaRD] Preparando tunel Cloudflare...

if not exist cloudflared.exe (
    echo [ERROR] cloudflared.exe no esta en la carpeta del proyecto.
    pause
    exit /b 1
)

rem Comprobar que no haya otro tunel activo
tasklist | findstr /I /C:"cloudflared.exe" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] Ya hay un tunel Cloudflare en ejecucion.
    echo         Cierra el proceso anterior antes de crear otro.
    pause
    exit /b 1
)

rem Iniciar Vite solo si no esta corriendo
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [Vite] Arrancando servidor en http://localhost:5173 ...
    start "ConsolidaRD Dev" /B node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173 --strictPort
) else (
    echo [Vite] Servidor ya en ejecucion.
)

rem Lanzar el tunel en segundo plano
echo [Tunel] Conectando con Cloudflare...
del /q "%TEMP%\cfd_tunel.log" >nul 2>&1
start "ConsolidaRD Tunel" /B tunel_cloudflare.bat

rem Esperar y capturar la URL publica
echo [Tunel] Obteniendo URL publica...
set "PUBLIC="
set /a tries=0

:loop
set /a tries+=1
if !tries! gtr 40 (
    echo [ERROR] No se pudo obtener la URL. Revisa: %TEMP%\cfd_tunel.log
    pause
    exit /b 1
)
for /f "usebackq tokens=4 delims= " %%u in (`findstr /R /C:"https://[a-z0-9-]*\.trycloudflare\.com" "%TEMP%\cfd_tunel.log" 2^>nul`) do set "PUBLIC=%%u"
if not defined PUBLIC (
    ping -n 3 127.0.0.1 >nul
    goto loop
)

echo.
echo ================================================================
echo   ConsolidaRD disponible publicamente:
echo.
echo     %PUBLIC%
echo.
echo   Servidor local: http://localhost:5173
echo   API:           http://localhost:3001
echo ================================================================
echo.
echo Cierra esta ventana para detener el tunel y el servidor.
pause