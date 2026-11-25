@echo off
chcp 65001 >nul
title AFEIA - Installation des outils
echo.
echo  Installation des outils gratuits et open source pour AFEIA :
echo    - Git            (recuperer et enregistrer le code)
echo    - Node.js LTS    (faire tourner l'application)
echo    - Rancher Desktop (faire tourner la base Supabase locale)
echo.
echo  Windows peut te demander d'autoriser chaque installation : reponds Oui.
echo.
pause
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
winget install -e --id SUSE.RancherDesktop --accept-source-agreements --accept-package-agreements
echo.
echo  ============================================================
echo   Installation terminee.
echo   1. Redemarre ton PC.
echo   2. Ouvre "Rancher Desktop" depuis le menu Demarrer.
echo      Au premier lancement :
echo        - decoche "Enable Kubernetes"
echo        - choisis le moteur "dockerd (moby)"
echo      Attends que la barre en bas affiche que tout est pret.
echo   3. Double-clique ensuite sur 2-installer-afeia.cmd
echo  ============================================================
pause
