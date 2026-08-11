@echo off
setlocal enabledelayedexpansion
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"

echo ================================================================
echo   Consolida RD - Instalador
echo ================================================================
echo.

rem --- Verificar Node.js ---
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo         Descargalo de: https://nodejs.org (version LTS 22.5 o superior)
    echo         e instala con las opciones por defecto. Luego vuelve a ejecutar.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [Node] Detectado: !NODEV!

rem Verificar version minima (22.5 para node:sqlite)
set "VER="
for /f "tokens=1 delims=.v" %%a in ('node -p "process.versions.node"') do set MAJOR=%%a
for /f "tokens=2 delims=." %%b in ('node -p "process.versions.node"') do set MINOR=%%b
if !MAJOR! LSS 22 (
    echo [ERROR] Se requiere Node.js 22.5 o superior. Version detectada: !MAJOR!.!MINOR!
    echo         Actualizalo desde: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Version compatible: !MAJOR!.!MINOR!
echo.

rem --- Instalar dependencias backend ---
echo [Backend] Instalando dependencias...
cd /d "%~dp0backend"
if exist node_modules (
    echo [Backend] node_modules ya existe, omitiendo npm install.
) else (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo al instalar dependencias del backend.
        pause
        exit /b 1
    )
)

rem --- Instalar dependencias frontend ---
echo [Frontend] Instalando dependencias...
cd /d "%~dp0frontend"
if exist node_modules (
    echo [Frontend] node_modules ya existe, omitiendo npm install.
) else (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo al instalar dependencias del frontend.
        pause
        exit /b 1
    )
)

rem --- Crear base de datos (migraciones) ---
echo [Base de datos] Creando/actualizando esquema...
cd /d "%~dp0backend"
call node src/migrations/run.js
if errorlevel 1 (
    echo [ERROR] Fallo al crear la base de datos.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   Instalacion completada.
echo.
echo   Ahora ejecuta:  iniciar.bat
echo   para arrancar la plataforma.
echo ================================================================
echo.
pause