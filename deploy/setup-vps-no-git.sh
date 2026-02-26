#!/usr/bin/env bash
# Hostinger VPS — GitHub OLMADAN kurulum.
# Proje zaten /opt/super-reasoning içinde (ZIP açılmış veya rsync ile atılmış) olmalı.
# Kullanım: ZIP'i sunucuya atıp açtıktan sonra: sudo bash deploy/setup-vps-no-git.sh
set -euo pipefail

APP_NAME="super-reasoning"
APP_DIR="/opt/$APP_NAME"
DOMAIN="${DOMAIN:-srv1327766.hstgr.cloud}"
API_PORT="${API_PORT:-4000}"
NODE_VERSION="${NODE_VERSION:-22}"

echo "========================================"
echo "  Super Reasoning — Hostinger (GitHub'sız)"
echo "  Dizin: $APP_DIR | Domain: $DOMAIN"
echo "========================================"

if [ ! -d "$APP_DIR" ] || [ ! -f "$APP_DIR/package.json" ]; then
  echo "HATA: $APP_DIR bulunamadi veya package.json yok."
  echo "Once projeyi bu dizine cikarin (ZIP acin veya rsync ile atin)."
  exit 1
fi

echo "[1/6] Sistem güncelleniyor..."
apt update && apt upgrade -y

echo "[2/6] Gerekli paketler..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo "[3/6] Node.js $NODE_VERSION..."
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

echo "[4/6] Bağımlılıklar ve build..."
cd "$APP_DIR"
npm ci || npm install
npm run build

echo "[5/6] .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  [ -f "$APP_DIR/.env.example" ] && cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "  .env olusturuldu -> nano $APP_DIR/.env ile duzenleyin!"
fi

echo "[6/6] Systemd servisi..."
cat > "/etc/systemd/system/${APP_NAME}.service" << EOF
[Unit]
Description=Super Reasoning (API + Frontend)
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=NODE_ENV=production
Environment=SR_API_PORT=$API_PORT
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${APP_NAME}"
systemctl restart "${APP_NAME}"

echo "Nginx..."
cat > "/etc/nginx/sites-available/$APP_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 10m;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

ln -sf "/etc/nginx/sites-available/$APP_NAME" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "========================================"
echo "  KURULUM TAMAMLANDI"
echo "========================================"
echo "  Uygulama : http://$DOMAIN"
echo "  API      : http://$DOMAIN/v1/health"
echo "  .env     : nano $APP_DIR/.env"
echo "  Restart  : systemctl restart $APP_NAME"
echo "  SSL      : certbot --nginx -d $DOMAIN"
echo "========================================"
