@echo off
title AL DIA - Servidor
cd /d %~dp0

:loop
echo [%date% %time%] Iniciando servidor...
venv\Scripts\python.exe -c "from waitress import serve; from app import app; print('AL DIA -- http://localhost:5000'); serve(app, host='0.0.0.0', port=5000, threads=4)"
echo [%date% %time%] Servidor caido. Reiniciando en 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
