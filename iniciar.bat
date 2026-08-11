@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ================================================================
echo   Consolida RD - Inicio
echo ================================================================
echo.

rem ---------------------------------------------------------------
rem  Buscar Node.js (PATH o ubicaciones comunes)
rem ---------------------------------------------------------------
set "NODE_BIN="
where node >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%p in ('where node') do set "NODE_BIN=%%~dp"
    goto node_encontrado
)
set "CANDIDATOS=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs;C:\nodejs"
for %%c in ("%CANDIDATOS:;=" "%") do (
    if exist "%%~c\node.exe" (
        set "NODE_BIN=%%~c\"
        goto node_encontrado
    )
)
echo [ERROR] No se encontro Node.js. Ejecuta primero:  instalar.bat
pause
exit /b 1

:node_encontrado
set "PATH=%NODE_BIN%;%PATH%"

rem ---------------------------------------------------------------
rem  Verificar dependencias instaladas
rem ---------------------------------------------------------------
if not exist "%~dp0backend\node_modules" (
    echo [ERROR] Las dependencias del backend no estan instaladas.
    echo         Ejecuta primero:  instalar.bat
    pause
    exit /b 1
)
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] Las dependencias del frontend no estan instaladas.
    echo         Ejecuta primero:  instalar.bat
    pause
    exit /b 1
)

rem ---------------------------------------------------------------
rem  Verificar base de datos
rem ---------------------------------------------------------------
if not exist "%~dp0backend\database.sqlite" (
    echo [INFO] Creando base de datos por primera vez...
    cd /d "%~dp0backend"
    call node src/migrations/run.js
)

rem ---------------------------------------------------------------
rem  Arrancar servicios
rem ---------------------------------------------------------------
echo [API] Arrancando http://localhost:3001 ...
cd /d "%~dp0backend"
start "Consolida RD API" /B node src/index.js

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