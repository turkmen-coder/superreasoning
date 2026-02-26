# Hostinger'a Deploy Rehberi

Bu rehber, Super Reasoning projesini **Hostinger VPS** üzerinde çalıştırmak için adım adım talimatlar içerir.

> Ops Runbook (deploy + SSL + rollback + incident): [OPS-RUNBOOK.md](./OPS-RUNBOOK.md)

---

## Seçenek 1: VPS ile SSH (Önerilen)

Hostinger VPS veya KVM VPS satın aldıysanız, SSH ile sunucuya bağlanıp tek script ile kurulum yapabilirsiniz.

### Gereksinimler

- Hostinger VPS (Ubuntu 22.04 / 24.04 önerilir)
- SSH erişimi (root veya sudo kullanıcı)
- Projenin bir Git reposunda olması (GitHub/GitLab)

### Adım 1: VPS bilgilerini alın

1. Hostinger hPanel → **VPS** → VPS’inize tıklayın.
2. **SSH erişim** bilgilerini not alın: IP, kullanıcı (genelde `root`), şifre veya SSH key.
3. Hostname’i not alın (örn. `srv1327766.hstgr.cloud`).

### Adım 2: İlk SSH bağlantısı

```bash
ssh root@SUNUCU_IP
# veya: ssh root@srv1327766.hstgr.cloud
```

### Adım 3: Kurulum scriptini çalıştırın

**A) Repo’yu sunucuya kopyalayıp scripti orada çalıştırma**

```bash
# Sunucuda
apt update && apt install -y git
git clone https://github.com/KULLANICI_ADINIZ/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
# deploy/setup-vps.sh içindeki REPO_URL ve DOMAIN'i düzenleyin (veya aşağıdaki gibi env ile verin)
REPO_URL="https://github.com/SIZIN_KULLANICI/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

**B) Sadece scripti sunucuya atıp, projeyi scriptin içinde klonlatma**

`deploy/setup-vps.sh` içinde şu satırları kendi bilgilerinizle değiştirin:

- `REPO_URL` → Kendi GitHub/GitLab repo URL’iniz
- `DOMAIN` → Hostinger hostname’iniz (örn. `srv1327766.hstgr.cloud`) veya kendi domain’iniz

Sonra sunucuda:

```bash
curl -sSL "https://raw.githubusercontent.com/KULLANICI_ADINIZ/super-reasoning/main/deploy/setup-vps.sh" -o setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

Veya scripti elle kopyalayıp:

```bash
sudo bash /opt/super-reasoning/deploy/setup-vps.sh
```

### Adım 4: Ortam değişkenleri (.env)

Kurulumdan sonra mutlaka `.env` dosyasını düzenleyin:

```bash
nano /opt/super-reasoning/.env
```

En az şunları ayarlayın:

- `DATABASE_URL` veya Supabase kullanıyorsanız ilgili env’ler
- `SR_USE_DB_STORE=true` ve `SR_DEFAULT_ORG_ID` (SaaS modu için)
- API anahtarları: `GEMINI_API_KEY`, `VITE_HUGGING_FACE_HUB_TOKEN` vb.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` vb. (ödeme kullanacaksanız)
- Supabase Auth: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (auth kullanacaksanız)

Kaydedip servisi yeniden başlatın:

```bash
systemctl restart super-reasoning
```

### Adım 5: SSL (HTTPS)

Kendi domain’inizi kullanıyorsanız ücretsiz SSL:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Hostinger hostname (`srv1327766.hstgr.cloud`) için Hostinger panelinden SSL açılıp açılamayacağını kontrol edin; gerekirse yine `certbot --nginx -d srv1327766.hstgr.cloud` deneyebilirsiniz.

### Adım 6: Kontrol

- Site: `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud`
- API sağlık: `http://SUNUCU_IP/v1/health`

---

## Güncelleme (Update)

Kod güncelledikten sonra VPS’te:

```bash
ssh root@SUNUCU_IP
cd /opt/super-reasoning
bash deploy/update-vps.sh
```

Veya uzaktan tek komutla:

```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

`update-vps.sh`: `git pull`, `npm ci`, `npm run build`, `systemctl restart super-reasoning` yapar.

---

## Seçenek 2: Hostinger Business / Cloud (Node.js uygulaması)

Hostinger **Business** veya **Cloud** planında “Node.js Web App” özelliği varsa:

1. hPanel → **Websites** → **Node.js** bölümüne girin.
2. **Create Node.js App** ile yeni uygulama oluşturun.
3. **GitHub** ile repo’yu bağlayın veya **Upload** ile proje zip’i yükleyin.
4. **Build command:** `npm ci && npm run build`
5. **Start command:** `npx tsx server/index.ts` (veya `node server/index.js` — önce `tsx` ile build edilmiş tek JS çıktısı kullanıyorsanız ona göre ayarlayın)
6. **Environment variables** kısmına `.env` değerlerinizi ekleyin (DATABASE_URL, API keys, Stripe, Supabase vb.).
7. Root / public path’i `dist` veya uygulamanın statik dosya sunacak şekilde ayarlayın (Express zaten `dist` sunuyorsa ekstra bir şey gerekmez).

Not: Bu modda tek process (Express) hem API hem `dist` sunar; ayrı frontend process’e gerek yoktur.

---

## Mimari (VPS kurulumu)

```
Internet
   │
   ▼
Nginx (:80 / :443)
   │
   ▼
Express (:4000) — Tek process
   ├── /         → dist (frontend)
   ├── /v1/*     → API
   └── /api/v1/* → API
```

- **Tek servis:** `super-reasoning` (systemd)
- **Port:** 4000 (Nginx proxy ile dışarıya 80/443)

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|-------|--------|
| 502 Bad Gateway | `systemctl status super-reasoning` ile servisi kontrol edin; `.env` ve `DATABASE_URL` doğru mu bakın. |
| 403 Forbidden | `vite.config.ts` içinde `preview.allowedHosts` kullanılmıyor (production’da Vite preview yok); Nginx’te `server_name` doğru mu kontrol edin. |
| API çalışmıyor | `journalctl -u super-reasoning -f` ile log alın; port 4000’in dinlendiğini `ss -tlnp \| grep 4000` ile kontrol edin. |
| Build hatası | Sunucuda `node -v` (18+), `npm -v`; `npm run build` çıktısındaki hata mesajını inceleyin. |

---

## Özet komutlar

```bash
# Kurulum (sunucuda, repo ve domain kendi değerlerinizle)
REPO_URL="https://github.com/SIZIN_KULLANICI/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh

# .env düzenle
nano /opt/super-reasoning/.env
systemctl restart super-reasoning

# Güncelleme
bash deploy/update-vps.sh

# Log
journalctl -u super-reasoning -f
```

Bu adımlarla proje Hostinger VPS’te tek process (Express) ve Nginx ile çalışır.
