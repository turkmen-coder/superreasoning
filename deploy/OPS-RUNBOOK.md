---
title: Super Reasoning Ops Runbook
description: VPS deployment, SSL, Nginx, verification, rollback, and incident recovery checklist.
---

# Super Reasoning — OPS RUNBOOK

Bu doküman, production VPS operasyonları için tek referans kaynaktır.

## 1) Ortam Bilgileri

- App path (VPS): `/var/www/super-reasoning`
- Backup path (VPS): `/var/www/backups/super-reasoning`
- Deploy host: `srv1327766.hstgr.cloud`
- Domains: `neomagic.org`, `www.neomagic.org`
- Web server: `nginx`

## 2) Standart Deploy (Önerilen)

### 2.1 Local build

```bash
npm ci
npm run build
```

### 2.2 VPS deploy script

```bash
bash ./deploy.sh
```

Bu script:
1. SSH bağlantısını test eder
2. VPS üzerinde backup alır
3. `dist/` içeriğini rsync ile yükler
4. izinleri düzeltir
5. `nginx reload` yapar
6. HTTP kontrolü yapar

## 3) Manuel Deploy (Script yoksa)

```bash
# Local
npm run build

# Upload
rsync -avz --delete --exclude='._*' --exclude='.DS_Store' ./dist/ root@srv1327766.hstgr.cloud:/var/www/super-reasoning/

# Remote (VPS)
ssh root@srv1327766.hstgr.cloud << 'EOF'
find /var/www/super-reasoning -name '._*' -delete
find /var/www/super-reasoning -name '.DS_Store' -delete
chown -R www-data:www-data /var/www/super-reasoning
chmod -R 755 /var/www/super-reasoning
find /var/www/super-reasoning -type f -name '*.html' -exec chmod 644 {} \;
find /var/www/super-reasoning -type f -name '*.css' -exec chmod 644 {} \;
find /var/www/super-reasoning -type f -name '*.js' -exec chmod 644 {} \;
systemctl reload nginx
EOF
```

## 4) Nginx Konfigürasyon (SPA + HTTPS)

Örnek dosya: `/etc/nginx/sites-available/super-reasoning`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name neomagic.org www.neomagic.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name neomagic.org www.neomagic.org;

    root /var/www/super-reasoning;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/neomagic.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neomagic.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }
}
```

Enable:

```bash
ln -s /etc/nginx/sites-available/super-reasoning /etc/nginx/sites-enabled/super-reasoning
nginx -t
systemctl reload nginx
```

## 5) SSL (Let's Encrypt)

```bash
apt update
apt install -y certbot python3-certbot-nginx
certbot --nginx -d neomagic.org -d www.neomagic.org
```

Renewal test:

```bash
certbot renew --dry-run
```

## 6) Post-Deploy Doğrulama

```bash
curl -I https://neomagic.org | head -n 1
curl -I https://www.neomagic.org | head -n 1
curl -I http://srv1327766.hstgr.cloud | head -n 1
```

Beklenti:
- domainler: `HTTP/1.1 200 OK`
- bare host 404 olabilir (host-based nginx routing)

## 7) Rollback Prosedürü

Deploy script backup aldığı için rollback hızlıdır.

### 7.1 Son backup'ı bul

```bash
ssh root@srv1327766.hstgr.cloud "ls -1dt /var/www/backups/super-reasoning/backup-* | head -n 5"
```

### 7.2 Geri dön

```bash
ssh root@srv1327766.hstgr.cloud << 'EOF'
LATEST_BACKUP=$(ls -1dt /var/www/backups/super-reasoning/backup-* | head -n 1)
rm -rf /var/www/super-reasoning
cp -r "$LATEST_BACKUP" /var/www/super-reasoning
chown -R www-data:www-data /var/www/super-reasoning
chmod -R 755 /var/www/super-reasoning
systemctl reload nginx
EOF
```

### 7.3 Rollback doğrula

```bash
curl -I https://neomagic.org | head -n 1
```

## 8) Incident Recovery Checklist

1. **Erişim kontrolü:**
   - `systemctl status nginx --no-pager`
   - `nginx -t`
2. **Disk/RAM kontrolü:**
   - `df -h`
   - `free -h`
3. **Log kontrolü:**
   - `journalctl -u nginx -n 200 --no-pager`
   - `tail -n 200 /var/log/nginx/error.log`
4. **Hızlı çözüm:**
   - Son başarılı backup'a rollback
5. **Sonraki adım:**
   - root-cause notu + kalıcı düzeltme

## 9) Sık Hatalar ve Çözüm

- `404 Not Found` (bare host):
  - domain-based vhost aktif, normal olabilir.
- `403 Forbidden`:
  - `root` path ve izinleri kontrol et (`www-data`).
- `502/504`:
  - reverse proxy backend yapılandırması ve upstream health kontrolü.
- SSL hatası:
  - sertifika path'leri ve `certbot renew --dry-run` kontrolü.

## 10) Operasyon Notları

- Deploy öncesi her zaman `npm run build`.
- Deploy sonrası minimum 2 domain health check zorunlu.
- Kritikte önce servis geri dönüşü, sonra kök neden analizi.
