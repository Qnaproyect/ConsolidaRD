@echo off
cd /d "%~dp0"
cloudflared.exe tunnel --url http://127.0.0.1:5173 --no-autoupdate > "%TEMP%\cfd_tunel.log" 2>&1