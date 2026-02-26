#!/usr/bin/env bash
# GitHub kullanmadan güncelleme: sadece build + restart.
# Proje dosyalari zaten rsync/upload ile guncellendiyse bu scripti calistirin.
set -euo pipefail

APP_NAME="super-reasoning"
APP_DIR="/opt/$APP_NAME"

cd "$APP_DIR"
npm ci || npm install
npm run build
systemctl restart "$APP_NAME"
echo "Guncelleme tamamlandi. systemctl status $APP_NAME"
