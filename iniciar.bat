@echo off
setlocal enabledelayedexpansion
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"

echo ================================================================
echo   Consolida RD - Inicio
echo ================================================================
echo.

rem --- Verificar que las dependencias esten instaladas ---
if not exist "%~dp0backend\node_modules" (
    echo [ERROR] Las dependencias no estan instaladas.
    echo         Ejecuta primero:  instalar.bat
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] Las dependencias del frontend no estan instaladas.
    echo         Ejecuta primero:  instalar.bat
    echo.
    pause
    exit /b 1
)

rem --- Verificar base de datos ---
if not exist "%~dp0backend\database.sqlite" (
    echo [INFO] Creando base de datos por primera vez...
    cd /d "%~dp0backend"
    call node src/migrations/run.js
)

rem --- Arrancar API ---
echo [API] Arrancando http://localhost:3001 ...
start "Consolida RD API" /B node src/index.js

rem --- Arrancar frontend ---
echo [Frontend] Arrancando http://localhost:5173 ...
cd /d "%~dp0frontend"
start "Consolida RD Frontend" /B node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173 --strictPort

echo.
echo ================================================================
echo   Consolida RD iniciado:
echo.
echo     Portal:   http://localhost:5173
echo     API:      http://localhost:3001
echo.
echo   Usuario:   admin@consolidard.com
echo   Password:  admin123
echo ================================================================
echo.
echo Cierra esta ventana para detener los servicios.
pause