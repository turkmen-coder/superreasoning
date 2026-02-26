# VPS Deploy — Hızlı Adımlar (macOS)

## 1. Yerel: Deploy ZIP oluştur

```bash
cd "/Volumes/GÖKHAN 3/super-reasoning-v3.1-main"
npm run build
bash deploy/create-deploy-zip.sh
```

ZIP: `dist-deploy/super-reasoning_YYYYMMDD_HHMMSS.zip`

---

## 2. ZIP'i VPS'e yükle

- **Hostinger:** hPanel → Dosya Yöneticisi veya SFTP (FileZilla) ile `/opt` dizinine ZIP'i yükleyin.
- **Başka VPS:** `scp dist-deploy/super-reasoning_*.zip root@SUNUCU_IP:/opt/`

---

## 3. SSH ile bağlanıp kur

```bash
ssh root@SUNUCU_IP
```

```bash
cd /opt
mkdir -p super-reasoning
unzip -o super-reasoning_*.zip -d super-reasoning
cd super-reasoning
chmod +x deploy/setup-vps-no-git.sh
DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh
```

`DOMAIN` yerine kendi hostname veya domain'inizi yazın (örn. `panel.siteniz.com`).

---

## 4. .env ayarla

```bash
nano /opt/super-reasoning/.env
```

En az bir LLM API anahtarı ekleyin (Groq, Gemini, OpenAI vb.). Kaydedip:

```bash
systemctl restart super-reasoning
```

---

## 5. Kontrol

- Uygulama: **http://DOMAIN**
- API sağlık: **http://DOMAIN/v1/health**
- SSL: `certbot --nginx -d DOMAIN`

Detay: [HOSTINGER-SUNUCU-DEPLOY.md](HOSTINGER-SUNUCU-DEPLOY.md)
