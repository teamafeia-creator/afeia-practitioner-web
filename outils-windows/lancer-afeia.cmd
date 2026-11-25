@echo off
chcp 65001 >nul
rem Outils de Rancher Desktop (docker), au cas ou Windows n'a pas encore mis a jour le PATH.
set "PATH=%USERPROFILE%\.rd\bin;%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%PATH%"
title AFEIA - local (ferme cette fenetre pour arreter l'application)
cd /d "%~dp0.."
docker info >nul 2>&1 || (echo Rancher Desktop n'est pas demarre : ouvre-le, attends qu'il soit pret, puis relance ce fichier. & pause & exit /b 1)
rem Dependances a jour ? (package-lock.json plus recent que l'installation)
node -e "const f=require('fs');try{process.exit(f.statSync('package-lock.json').mtimeMs>f.statSync('node_modules/.package-lock.json').mtimeMs?1:0)}catch{process.exit(1)}" || (echo Installation des dependances... & call npm ci)
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
start "AFEIA - synchro GitHub" /min cmd /k node scripts\local-sync.mjs
call npm run dev
