@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Cette action efface toutes les donnees de TEST locales et recharge les donnees de demo.
echo (La production n'est pas concernee.)
choice /m "Continuer"
if errorlevel 2 exit /b 0
call npm run db:reset
pause
