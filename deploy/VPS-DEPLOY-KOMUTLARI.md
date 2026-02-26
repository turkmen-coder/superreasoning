# VPS'e Deploy — Hazır Komutlar

**Hostinger sunucuya deploy (GitHub’sız veya GitHub ile):**  
→ **[deploy/HOSTINGER-SUNUCU-DEPLOY.md](HOSTINGER-SUNUCU-DEPLOY.md)** — tek rehber.

---

## Yerel Geliştirme (AI Lab / RD-Agent dahil)

Tek komutla API + frontend başlat (tek terminal):

```bash
npm run dev:all
```

- API: http://localhost:4000  
- Web: http://localhost:3000 (veya Vite’ın söylediği port)  
- Durdurmak: **Ctrl+C**

Sadece API veya sadece frontend için:

```bash
npm run api          # Sadece backend (4000)
npm run dev          # Sadece frontend (3000)
```

`.env` dosyasında en az bir LLM anahtarı olmalı (örn. `VITE_GROQ_API_KEY`, `GEMINI_API_KEY`) ki AI Lab / RD-Agent çalışsın.

---

## Seçenek 1: Hostinger VPS — GitHub ile (SSH + script)

```bash
ssh root@SUNUCU_IP
apt update && apt install -y git
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
REPO_URL="https://github.com/gokhanturkmeen/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

`DOMAIN` = kendi Hostinger hostname veya domain’iniz. Sonra:  
`nano /opt/super-reasoning/.env` → `systemctl restart super-reasoning`

---

## Seçenek 1b: Hostinger VPS — GitHub’sız (ZIP yükle)

1. **ZIP oluştur (Windows):** proje kökünde `.\deploy\create-deploy-zip.ps1`  
2. **ZIP’i sunucuya yükle** (hPanel Dosya Yöneticisi veya SFTP → `/opt`).  
3. **SSH:**  
   `cd /opt && unzip -o super-reasoning_....zip && mv super-reasoning-v3.1-main super-reasoning` (klasör adına göre)  
   `cd /opt/super-reasoning && DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh`  
4. **.env:** `nano /opt/super-reasoning/.env` → `systemctl restart super-reasoning`

Detay: **[HOSTINGER-SUNUCU-DEPLOY.md](HOSTINGER-SUNUCU-DEPLOY.md)**

---

## Seçenek 2: SSH + Docker Compose

VPS’te Docker kuruluysa:

```bash
ssh root@VPS_IP_ADRESINIZ
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
docker compose up -d --build
```

Uygulama: `http://VPS_IP:4000`  
Firewall’da 4000 portunu açmayı unutmayın.

---

## Güncelleme

Kod değişince VPS’te:

```bash
ssh root@VPS_IP "cd /opt/super-reasoning && git pull && (npm run build 2>/dev/null; systemctl restart super-reasoning 2>/dev/null) || (docker compose up -d --build)"
```

Seçenek 1 kullandıysanız sadece:  
`ssh root@VPS_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"`
