@echo off
chcp 65001 >nul
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
:projet
where node >nul 2>&1 || (echo Node.js est introuvable : lance d'abord 1-installer-les-outils.cmd puis redemarre le PC. & goto erreur)
docker info >nul 2>&1 || (echo Rancher Desktop n'est pas demarre : ouvre-le, attends qu'il soit pret, puis relance ce fichier. & goto erreur)

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
