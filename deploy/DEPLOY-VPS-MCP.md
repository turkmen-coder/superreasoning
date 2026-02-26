# Hostinger VPS’e MCP ile Deploy

Bu rehber, **Hostinger MCP** kullanarak projeyi VPS’te Docker Compose ile çalıştırmanızı anlatır.

---

## 1. Hostinger MCP kimlik doğrulama

MCP’nin çalışması için API anahtarı gerekir.

### API anahtarı alma

1. [hPanel](https://hpanel.hostinger.com) → **Account Profile** → **Account Information**
2. **API** bölümüne gidin, **Generate** ile yeni anahtar oluşturun
3. İndirilen JSON’daki anahtarı veya panelde gösterilen **API Token** değerini kopyalayın

### Cursor’da MCP ayarı

**Windows:** `C:\Users\KULLANICI_ADI\.cursor\mcp.json`  
**Mac/Linux:** `~/.cursor/mcp.json`

Dosyayı açıp aşağıdaki yapıyı ekleyin (kendi token’ınızı yazın):

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": ["-y", "hostinger-api-mcp@latest"],
      "env": {
        "API_TOKEN": "BURAYA_HOSTINGER_API_ANAHTARINIZ"
      }
    }
  }
}
```

Cursor’u tamamen kapatıp yeniden açın. Sonra sohbetten “List my VPS” veya “List my virtual machines” diyerek bağlantıyı test edin.

---

## 2. VPS’e proje deploy (MCP ile)

Aşağıdaki adımlar Cursor AI ile “MCP ile VPS’e deploy et” dediğinizde uygulanabilir.

### Gereksinimler

- Hostinger’da bir **VPS** (KVM/VPS) açık olmalı
- Proje **GitHub** (veya GitLab) repo’da olmalı; root’ta **docker-compose.yaml** bulunur (production için hazır)
- MCP kimliği doğrulanmış olmalı

### MCP ile yapılacak işlemler

1. **Sanal makineleri listele**  
   `getVirtualMachinesV1` ile VPS listesini alın, kullanacağınız **virtualMachineId** değerini not edin.

2. **Docker Compose projesi oluştur**  
   `createNewProjectV1` çağrılır:
   - **virtualMachineId:** Yukarıdaki VPS ID
   - **project_name:** Örn. `super-reasoning` (alfanümerik, tire/alt çizgi)
   - **content:** GitHub repo URL’i, örn.  
     `https://github.com/KULLANICI_ADINIZ/super-reasoning`  
     Hostinger bu repoyu klonlar ve root’taki **docker-compose.yaml** ile projeyi çalıştırır.

3. **Proje çalışıyor mu kontrol**  
   `getProjectListV1` veya `getProjectContainersV1` ile proje ve konteyner durumuna bakılır.

### Repo’da olması gerekenler

- Root’ta **docker-compose.yaml** (production: tek `app` servisi, port 4000)
- Root’ta **Dockerfile** (mevcut projede var)

Proje ilk kez deploy edilirken image build edilir ve 4000 portunda yayına alınır.

---

## 3. Ortam değişkenleri (API anahtarları, DB)

Docker Compose’ta `.env` kullanmıyorsanız, değişkenleri Hostinger üzerinden vermeniz gerekir.

- **Hostinger VPS / Docker:**  
  Proje oluşturulurken `createNewProjectV1` içinde **environment** parametresi varsa oraya ekleyin.  
  Yoksa, VPS’e SSH ile bağlanıp proje klasöründe `.env` oluşturup `docker compose up -d` ile yeniden başlatın.

- **Örnek .env (VPS’te):**  
  `GEMINI_API_KEY`, `DATABASE_URL`, `STRIPE_*`, `SUPABASE_*` vb.

---

## 4. Erişim ve güncelleme

- **Uygulama:** `http://VPS_IP:4000`  
  İsterseniz Nginx ile 80/443’e yönlendirebilirsiniz.

- **Güncelleme:**  
  Repo’da kod değişince MCP’de **updateProjectV1** ile projeyi güncelleyebilir veya VPS’e SSH ile bağlanıp:
  ```bash
  cd /path/to/project   # Hostinger’ın clone ettiği dizin
  git pull
  docker compose up -d --build
  ```

---

## 5. Sorun giderme

| Durum | Ne yapılır |
|--------|-------------|
| **Unauthenticated** | MCP `API_TOKEN` doğru mu, Cursor yeniden başlatıldı mı kontrol edin. |
| **Build hatası** | VPS’te `getProjectLogsV1` ile loglara bakın; Dockerfile ve docker-compose.yaml’ı kontrol edin. |
| **Port kapalı** | VPS firewall’da 4000 açık mı; Hostinger panelinden gerekirse 4000’i açın. |

Bu adımlarla MCP ile Hostinger VPS’e deploy tamamlanmış olur.
