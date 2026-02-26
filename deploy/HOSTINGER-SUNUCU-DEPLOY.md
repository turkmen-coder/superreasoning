# Hostinger Sunucuya Deploy (GitHub’sız veya GitHub ile)

Uygulama **Hostinger VPS** üzerinde çalışır. İki yol: **GitHub ile** veya **dosya yükleyerek (GitHub’sız)**.

---

## Önce: Hostinger VPS bilgileri

1. **hPanel** (hostinger.com giriş) → **VPS** → VPS’inizi seçin.
2. **IP adresi**, **SSH kullanıcı** (genelde `root`), **şifre** veya **SSH key**’i not alın.
3. Hostname (örn. `srv1327766.hstgr.cloud`) veya kendi domain’inizi kullanacaksınız.

Bağlantı:
```bash
ssh root@SUNUCU_IP
# veya
ssh root@srv1327766.hstgr.cloud
```

---

## Yöntem A: GitHub’sız — ZIP ile yükleme (Hostinger’a doğrudan)

GitHub kullanmadan, projeyi kendi bilgisayarınızda ZIP’leyip sunucuya atarsınız.

### 1. Deploy ZIP’i oluştur (Windows – proje klasöründe)

PowerShell:
```powershell
cd d:\super-reasoning-v3.1-main
.\deploy\create-deploy-zip.ps1
```

`dist-deploy` klasöründe `super-reasoning_YYYYMMDD_HHMMSS.zip` oluşur.

### 2. ZIP’i Hostinger’a yükle

- **hPanel** → **Dosya Yöneticisi** (File Manager) veya **SFTP** (örn. FileZilla, WinSCP).
- `/opt` dizinine gidin (yoksa SSH ile `mkdir -p /opt` yapın).
- ZIP’i `/opt` içine yükleyin (örn. `/opt/super-reasoning-deploy.zip`).

### 3. SSH ile bağlanıp açma ve kurulum

```bash
ssh root@SUNUCU_IP

cd /opt
unzip -o super-reasoning-deploy.zip
# ZIP içinde "super-reasoning-v3.1-main" gibi bir klasör varsa:
mv super-reasoning-v3.1-main super-reasoning
# veya ZIP doğrudan "super-reasoning" adında açıldıysa bir şey yapmayın

cd /opt/super-reasoning
chmod +x deploy/setup-vps-no-git.sh
DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh
```

`DOMAIN` yerine kendi hostname/domain’inizi yazın.

### 4. .env düzenle

```bash
nano /opt/super-reasoning/.env
```

En az: `GEMINI_API_KEY` veya `VITE_GROQ_API_KEY` vb. (AI Lab / RD-Agent için). Kaydedip:

```bash
systemctl restart super-reasoning
```

### 5. Güncelleme (yeni ZIP ile)

Yeni ZIP oluşturup sunucuya yükleyin, sonra:

```bash
ssh root@SUNUCU_IP
cd /opt
# Eski projeyi yedekleyip yeni ZIP'i acin veya ustune cikarin
unzip -o super-reasoning-deploy.zip -d super-reasoning-new
rm -rf /opt/super-reasoning/*
cp -a /opt/super-reasoning-new/* /opt/super-reasoning/
bash /opt/super-reasoning/deploy/update-vps-no-git.sh
```

---

## Yöntem B: GitHub ile (repo sunucuda clone)

Proje GitHub’da ise sunucuda clone edip tek script ile kurarsınız.

```bash
ssh root@SUNUCU_IP

apt update && apt install -y git
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning

REPO_URL="https://github.com/gokhanturkmeen/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

Sonra `.env` düzenleyip `systemctl restart super-reasoning`.

**Güncelleme:**
```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

---

## Yöntem C: rsync ile (yerel → Hostinger, GitHub’sız)

Projeyi kendi bilgisayarınızdan doğrudan sunucuya senkronize etmek için (Windows’ta Git Bash veya WSL, Mac/Linux’ta doğrudan):

```bash
# İlk sefer: sunucuda dizin olustur
ssh root@SUNUCU_IP "mkdir -p /opt/super-reasoning"

# Proje kokunden (node_modules ve .git haric)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@SUNUCU_IP:/opt/super-reasoning/
```

İlk kurulumda sunucuda:
```bash
ssh root@SUNUCU_IP
cd /opt/super-reasoning
DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh
```

Sonraki güncellemelerde sadece rsync + update script:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@SUNUCU_IP:/opt/super-reasoning/
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps-no-git.sh"
```

---

## Kontrol

| Ne       | URL |
|----------|-----|
| Site     | `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud` |
| API test | `http://SUNUCU_IP/v1/health` |

---

## SSL (HTTPS)

Kendi domain’iniz varsa:
```bash
ssh root@SUNUCU_IP
certbot --nginx -d siteniz.com -d www.siteniz.com
```

---

## Sık komutlar

```bash
# Servis durumu
systemctl status super-reasoning

# Log (canlı)
journalctl -u super-reasoning -f

# Yeniden başlat
systemctl restart super-reasoning

# .env düzenle
nano /opt/super-reasoning/.env
```

Özet: **Hostinger’a deploy** için ya GitHub’dan clone edip `setup-vps.sh` (Yöntem B), ya ZIP atıp `setup-vps-no-git.sh` (Yöntem A), ya da rsync + `setup-vps-no-git.sh` / `update-vps-no-git.sh` (Yöntem C) kullanın.
