@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env
if not exist .env.done (notepad .env & echo ok> .env.done)
node ems-bridge.mjs --grids
pause
