@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env
echo Edit .env if needed (password), then close Notepad.
if not exist .env.done (notepad .env & echo ok> .env.done)
node ems-bridge.mjs
pause
