@echo off
chcp 65001 >nul
set "PATH=%ProgramFiles%\Tailscale;%PATH%"
tailscale funnel --https=443 off
echo Lien fixe coupe. Relance lien-fixe-telephone.cmd pour le rouvrir (meme adresse).
pause
