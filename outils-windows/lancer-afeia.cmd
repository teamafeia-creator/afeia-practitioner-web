@echo off
chcp 65001 >nul
title AFEIA - local (ferme cette fenetre pour arreter l'application)
cd /d "%~dp0.."
docker info >nul 2>&1 || (echo Rancher Desktop n'est pas demarre : ouvre-le, attends qu'il soit pret, puis relance ce fichier. & pause & exit /b 1)
echo Demarrage de la base locale...
call npx supabase start || (pause & exit /b 1)
echo.
echo  ============================================================
echo   AFEIA local         : http://localhost:3000
echo   Donnees (Studio)    : http://localhost:54323
echo   E-mails de test     : http://localhost:54324
echo   Compte praticien    : demo@afeia.local  /  afeia-demo
echo   Compte admin        : admin@afeia.local /  afeia-admin
echo  ============================================================
echo.
start "" cmd /c "timeout /t 20 >nul & start http://localhost:3000"
call npm run dev
