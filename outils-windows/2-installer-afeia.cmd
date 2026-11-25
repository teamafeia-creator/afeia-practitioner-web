@echo off
chcp 65001 >nul
rem Outils de Rancher Desktop (docker), au cas ou Windows n'a pas encore mis a jour le PATH.
set "PATH=%USERPROFILE%\.rd\bin;%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%PATH%"
title AFEIA - Premiere installation
cd /d "%~dp0"
rem Ce script peut etre lance depuis le dossier AFEIA (a cote du projet) ou depuis outils-windows.
if exist "..\package.json" (cd .. & goto projet)
if not exist "afeia-practitioner-web" (
  echo Telechargement du code d'AFEIA...
  git clone https://github.com/teamafeia-creator/afeia-practitioner-web.git || goto erreur
)
cd afeia-practitioner-web
if not exist "supabase\config.jsonc" git checkout chore/environnement-local
echo Mise a jour du code...
git pull --ff-only
if /i not "%~dp0"=="%CD%\outils-windows\" (call "outils-windows\2-installer-afeia.cmd" & exit /b)
:projet
where node >nul 2>&1 || (echo Node.js est introuvable : lance d'abord 1-installer-les-outils.cmd puis redemarre le PC. & goto erreur)
where docker >nul 2>&1 || (echo Docker introuvable : Rancher Desktop est-il bien installe ? & goto erreur)
set /a ESSAIS=0
:attente_docker
docker info >nul 2>&1 && goto docker_ok
set /a ESSAIS+=1
if %ESSAIS% geq 18 (echo. & echo Rancher Desktop ne repond pas. Detail : & docker info & goto erreur)
echo Attente de Rancher Desktop... (%ESSAIS%/18)
timeout /t 10 >nul
goto attente_docker
:docker_ok

echo.
echo [1/4] Installation des dependances (quelques minutes la premiere fois)...
call npm install || goto erreur

echo.
echo [2/4] Structure de la base...
call npm run local:baseline || goto erreur

echo.
echo [3/4] Demarrage de Supabase local (longue la premiere fois : telechargement)...
call npx supabase start || goto erreur

echo.
echo [4/4] Configuration locale...
call npm run local:env || goto erreur

echo.
echo  Tout est pret. Lancement d'AFEIA...
call "outils-windows\lancer-afeia.cmd"
exit /b 0

:erreur
echo.
echo  Une etape a echoue. Copie le message ci-dessus et envoie-le a Claude.
pause
exit /b 1
