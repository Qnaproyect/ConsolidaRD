@echo off
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0backend"
start "Consolida RD API" /B node src/index.js
cd /d "%~dp0frontend"
start "Consolida RD Frontend" /B node node_modules\vite\bin\vite.js --host 0.0.0.0
echo Consolida RD iniciado:
echo   API:      http://localhost:3001
echo   Portal:   http://localhost:5173
pause
