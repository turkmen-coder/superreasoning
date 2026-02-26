# Super Reasoning — Yerel Çalıştırma

## KUR VE UYGULA (İlk seferde)

**1. Kur (bağımlılıkları yükle):**
```bash
npm install
```

**2. Uygula (uygulamayı çalıştır):**
```bash
npm run dev:all
```

- Tarayıcıda **http://localhost:3000** açın (frontend).
- API: **http://localhost:4000**  
Durdurmak için **Ctrl+C**.

---

## Tek komutla başlat (önerilen)

```bash
npm run dev:all
```

Bu komut **aynı anda** API (port 4000) ve frontend (port 3000) başlatır. Durdurmak için **Ctrl+C**.

- **API:** http://localhost:4000  
- **Web:** http://localhost:3000 (Vite farklı port söylerse ona gidin)

---

## Ayrı ayrı başlatma

**Terminal 1 — Backend:**
```bash
npm run api
```
Sunucu çalışırken bu terminalde komut satırı geri dönmez. Durdurmak: Ctrl+C.

**Terminal 2 — Frontend:**
```bash
npm run dev
```

---

## Code Optimizer şifresi

**Code Optimizer** sayfası şifre ile korunur. Varsayılan şifre: **`sr-optimize-2024`**

Şifreyi değiştirmek için `.env` dosyasında `VITE_OPTIMIZER_PASSWORD` değerini güncelleyin. Değişiklikten sonra uygulamayı yeniden başlatın (`npm run dev` veya `npm run dev:all`).

---

## AI Lab / RD-Agent için

1. **.env** dosyasında en az bir LLM anahtarı tanımlı olmalı:
   - `VITE_GROQ_API_KEY` veya `GROQ_API_KEY`
   - `GEMINI_API_KEY` veya `API_KEY`
   - `ANTHROPIC_API_KEY` veya `VITE_ANTHROPIC_API_KEY`
   - `DEEPSEEK_API_KEY` veya `VITE_DEEPSEEK_API_KEY`
   - `OPENROUTER_API_KEY` veya `VITE_OPENROUTER_API_KEY`

2. Backend çalışıyor olmalı (`npm run api` veya `npm run dev:all`).

3. Uygulamada giriş yapıp **AI Lab** sayfasına gidin; RD-Agent paneli ve "Ar-Ge Başlat" kullanılabilir olacaktır.

---

## "Failed to fetch" hatası

Backend’e ulaşılamıyorsa bu hata çıkar. Yapmanız gerekenler:

1. Backend’i başlatın: `npm run api` veya `npm run dev:all`
2. Port 4000’in boş olduğundan emin olun
3. Sayfayı yenileyin (F5)

---

## Production (tek sunucu)

```bash
npm run build
npm start
```

API ve build edilmiş frontend aynı process’te sunulur.
