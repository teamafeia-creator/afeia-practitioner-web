@echo off
chcp 65001 >nul
title AFEIA - Installation des outils
rem Rancher Desktop a besoin de WSL, qui s'installe en administrateur : on se relance en admin si besoin.
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
echo.
echo  Installation des outils gratuits et open source pour AFEIA :
echo    - Git            (recuperer et enregistrer le code)
echo    - Node.js LTS    (faire tourner l'application)
echo    - WSL + Rancher Desktop (faire tourner la base Supabase locale)
echo.
echo Activation de la virtualisation Windows (necessaire a WSL et Rancher Desktop)...
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
winget install -e --id Microsoft.WSL --accept-source-agreements --accept-package-agreements
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
