#!/usr/bin/env bash
# Hostinger VPS (veya herhangi bir Ubuntu/Debian) üzerinde Super Reasoning tam kurulum.
# Tek process: Express hem API hem frontend (dist) sunar.
set -euo pipefail

APP_NAME="super-reasoning"
APP_DIR="/opt/$APP_NAME"
# Aşağıdaki değerleri kendi Hostinger bilgilerinizle değiştirin:
REPO_URL="${REPO_URL:-https://github.com/KULLANICI_ADINIZ/super-reasoning.git}"
DOMAIN="${DOMAIN:-srv1327766.hstgr.cloud}"
API_PORT="${API_PORT:-4000}"
NODE_VERSION="${NODE_VERSION:-22}"

echo "========================================"
echo "  Super Reasoning — Hostinger VPS Kurulumu"
echo "  Domain/Host: $DOMAIN"
echo "  API port: $API_PORT"
echo "========================================"

echo "[1/7] Sistem güncelleniyor..."
apt update && apt upgrade -y

echo "[2/7] Gerekli paketler kuruluyor..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo "[3/7] Node.js $NODE_VERSION kuruluyor..."
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

echo "[4/7] Proje klonlanıyor..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[5/7] Bağımlılıklar ve production build..."
cd "$APP_DIR"
npm ci || npm install
npm run build

echo "[6/7] .env kontrol..."
if [ ! -f "$APP_DIR/.env" ]; then
  [ -f "$APP_DIR/.env.example" ] && cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "  .env oluşturuldu -> nano $APP_DIR/.env ile düzenleyin!"
fi

echo "[7/7] Systemd servisi (tek process: API + frontend)..."
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

echo "Nginx yapılandırılıyor..."
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
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

ln -sf "/etc/nginx/sites-available/$APP_NAME" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "Firewall ayarlanıyor..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "========================================"
echo "  KURULUM TAMAMLANDI"
echo "========================================"
echo ""
echo "  Uygulama : http://$DOMAIN"
echo "  API      : http://$DOMAIN/v1/health"
echo ""
echo "  Servis:"
echo "    systemctl status $APP_NAME"
echo "  Log:"
echo "    journalctl -u $APP_NAME -f"
echo ""
echo "  ÖNEMLİ:"
echo "    1) nano $APP_DIR/.env  (API anahtarları, DB, Stripe vb.)"
echo "    2) systemctl restart $APP_NAME"
echo "    3) SSL: certbot --nginx -d $DOMAIN"
echo "========================================"
