@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Arret de la base locale (tes donnees de test sont conservees)...
call npx supabase stop
echo Termine. Tu peux aussi quitter Rancher Desktop pour liberer la memoire.
pause
