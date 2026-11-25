@echo off
chcp 65001 >nul
rem Outils de Rancher Desktop (docker), au cas ou Windows n'a pas encore mis a jour le PATH.
set "PATH=%USERPROFILE%\.rd\bin;%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%PATH%"
cd /d "%~dp0.."
echo Arret de la base locale (tes donnees de test sont conservees)...
call npx supabase stop
echo Termine. Tu peux aussi quitter Rancher Desktop pour liberer la memoire.
pause
