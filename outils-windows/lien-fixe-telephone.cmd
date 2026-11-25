@echo off
chcp 65001 >nul
title AFEIA - lien fixe pour telephone (Tailscale Funnel)
set "PATH=%ProgramFiles%\Tailscale;%PATH%"
rem Lien FIXE via Tailscale Funnel (gratuit, open source). A faire une seule fois :
rem le lien reste actif ensuite, meme apres un redemarrage, tant qu'AFEIA tourne.
where tailscale >nul 2>&1 || (
  echo Installation de Tailscale ^(une seule fois, Windows va demander l'autorisation^)...
  winget install -e --id tailscale.tailscale --accept-source-agreements --accept-package-agreements
)
where tailscale >nul 2>&1 || (echo Tailscale introuvable : ferme cette fenetre et relance ce fichier. & pause & exit /b 1)
echo.
echo [1/2] Connexion a ton compte Tailscale (le navigateur s'ouvre si besoin)...
tailscale up || (echo Connexion impossible. & pause & exit /b 1)
echo.
echo [2/2] Ouverture du lien fixe vers AFEIA (port 3000)...
echo Si un lien https://login.tailscale.com/... s'affiche : ouvre-le, clique "Enable",
echo puis reviens ici.
tailscale funnel --bg 3000 || (echo Echec : envoie ce message a Claude. & pause & exit /b 1)
echo.
echo  ============================================================
echo   Ton lien fixe (a ouvrir sur ton telephone) :
tailscale funnel status
echo   Il reste actif tant qu'AFEIA tourne (lancer-afeia.cmd).
echo   Pour le couper : outils-windows\couper-lien-telephone.cmd
echo  ============================================================
pause
