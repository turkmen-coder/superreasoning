# Hostinger'a Deploy Adımları

Uygulama **Vite (React) + Express**; tek process hem API hem frontend sunar.

---

## Yöntem A: Hostinger VPS (SSH) — Önerilen

VPS’iniz varsa tek script ile kurulum yapılır.

### 1. VPS bilgileri

- hPanel → **VPS** → IP, kullanıcı (genelde `root`), şifre veya SSH key.

### 2. Sunucuya bağlanıp kurulum

```bash
ssh root@SUNUCU_IP
```

Aşağıdakileri kendi değerlerinizle değiştirip çalıştırın:

- `REPO_URL`: Projenin Git adresi (GitHub/GitLab).
- `DOMAIN`: Hostinger hostname (örn. `srv1327766.hstgr.cloud`) veya kendi domain.

```bash
apt update && apt install -y git
git clone https://github.com/KULLANICI_ADINIZ/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning

REPO_URL="https://github.com/KULLANICI_ADINIZ/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

### 3. Ortam değişkenleri

```bash
nano /opt/super-reasoning/.env
```

En az: `GEMINI_API_KEY`, gerekirse `DATABASE_URL`, `STRIPE_*`, `SUPABASE_*` vb. Kaydedip:

```bash
systemctl restart super-reasoning
```

### 4. SSL (isteğe bağlı)

```bash
certbot --nginx -d srv1327766.hstgr.cloud
```

### 5. Güncelleme

Kod değişince VPS’te:

```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

---

## Yöntem B: Hostinger Node.js Web App (Business/Cloud)

hPanel’de **Node.js** uygulaması açabiliyorsanız:

### 1. Deploy zip oluşturma (Windows)

Proje kökünde PowerShell:

```powershell
cd d:\super-reasoning-v3.1-main
.\deploy\create-deploy-zip.ps1
```

`dist-deploy` klasöründe `super-reasoning_YYYYMMDD_HHMMSS.zip` oluşur.

### 2. hPanel ayarları

1. **Websites** → **Node.js** → **Create Node.js App** (veya mevcut uygulamayı seçin).
2. **Upload** ile yukarıda oluşan zip’i yükleyin (veya GitHub bağlayın).
3. **Build command:** `npm ci && npm run build`
4. **Start command:** `npm start`
5. **Environment variables:** `.env` içeriğinizi tek tek ekleyin (GEMINI_API_KEY, DATABASE_URL vb.).
6. Root path: `dist` (veya panelde varsayılan; Express zaten `dist` sunuyor).

Kaydedip deploy’u başlatın.

---

## Kontrol

- Site: `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud`
- API: `http://SUNUCU_IP/v1/health`

---

## Hostinger MCP ile otomatik deploy

Cursor’da Hostinger MCP kimlik doğrulandıysa:

1. Deploy zip’i oluşturun (yukarıdaki PowerShell scripti).
2. MCP’de **deployJsApplication** kullanın; `archivePath` olarak bu zip’in yolunu, `domain` olarak Hostinger’daki domain’i verin.

Şu an API “Unauthenticated” dönüyorsa önce hPanel veya Hostinger API ile hesap bağlantısını kontrol edin.
