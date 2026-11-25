@echo off
chcp 65001 >nul
title AFEIA - lien pour telephone (ferme cette fenetre pour couper le lien)
set "PATH=%ProgramFiles(x86)%\cloudflared;%ProgramFiles%\cloudflared;%PATH%"
cd /d "%~dp0.."
rem Tunnel gratuit Cloudflare (cloudflared, open source) : pas de compte, lien temporaire.
where cloudflared >nul 2>&1 || (
  echo Installation de cloudflared ^(une seule fois^)...
  winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
)
where cloudflared >nul 2>&1 || (echo cloudflared introuvable : ferme cette fenetre et relance ce fichier. & pause & exit /b 1)
echo.
echo  ============================================================
echo   AFEIA doit deja tourner (lancer-afeia.cmd).
echo   Le lien pour ton telephone va s'afficher ci-dessous :
echo   une adresse en https://....trycloudflare.com
echo   Ce lien est public tant que cette fenetre est ouverte :
echo   ne le partage pas. Ferme la fenetre pour couper l'acces.
echo  ============================================================
echo.
cloudflared tunnel --no-autoupdate --url http://localhost:3000
