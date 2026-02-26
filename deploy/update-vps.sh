#!/usr/bin/env bash
# Hostinger VPS üzerinde projeyi günceller (git pull, build, restart).
# Kullanım: VPS'e SSH ile bağlanıp bu scripti çalıştırın veya rsync + ssh ile uzaktan çalıştırın.
set -euo pipefail

APP_NAME="super-reasoning"
APP_DIR="/opt/$APP_NAME"

echo "Güncelleme başlıyor..."
cd "$APP_DIR"
git pull origin main
npm ci || npm install
npm run build
systemctl restart "$APP_NAME"
echo "Güncelleme tamamlandı. Kontrol: systemctl status $APP_NAME"
