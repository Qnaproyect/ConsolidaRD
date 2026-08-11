@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ================================================================
echo   Consolida RD - Instalador
echo ================================================================
echo.

rem ---------------------------------------------------------------
rem  Buscar Node.js
rem  1) En el PATH
rem  2) En ubicaciones comunes de Windows
rem ---------------------------------------------------------------
set "NODE_BIN="

for %%i in (node.exe) do set "NODE_BIN=%%~dp$PATH:i"

if not defined NODE_BIN (
    for %%c in ("C:\Program Files\nodejs" "C:\Program Files (x86)\nodejs" "%LOCALAPPDATA%\Programs\nodejs" "C:\nodejs") do (
        if exist "%%~c\node.exe" set "NODE_BIN=%%~c\"
    )
)

if not defined NODE_BIN (
    echo [ERROR] No se encontro Node.js.
    echo.
    echo         Descargalo e instalalo desde:  https://nodejs.org
    echo         version LTS 22.5 o superior, opciones por defecto
    echo.
    echo         Luego vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

set "PATH=%NODE_BIN%;%PATH%"
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [Node] Detectado en: %NODE_BIN%
echo [Node] Version:      !NODEV!

rem Verificar que npm este junto a node
if not exist "%NODE_BIN%npm.cmd" (
    echo [ERROR] No se encontro npm.cmd junto a Node.js.
    pause
    exit /b 1
)

rem ---------------------------------------------------------------
rem  Verificar version minima (22.5 para node:sqlite)
rem ---------------------------------------------------------------
for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set MAJOR=%%a
if !MAJOR! LSS 22 (
    echo [ERROR] Se requiere Node.js 22.5 o superior. Version detectada: !MAJOR!
    echo         Actualizalo desde: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Version compatible.
echo.

rem ---------------------------------------------------------------
rem  Instalar dependencias backend
rem ---------------------------------------------------------------
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

rem ---------------------------------------------------------------
rem  Instalar dependencias frontend
rem ---------------------------------------------------------------
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

rem ---------------------------------------------------------------
rem  Crear base de datos (migraciones)
rem ---------------------------------------------------------------
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