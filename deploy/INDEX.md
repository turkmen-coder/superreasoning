# Deploy Documentation Index

Bu dizindeki deploy odaklı rehber ve scriptlerin hızlı erişim listesidir.

## Core Docs

- [OPS-RUNBOOK.md](./OPS-RUNBOOK.md) — Operasyon runbook: deploy, SSL, Nginx, rollback, incident checklist.
- [HOSTINGER.md](./HOSTINGER.md) — Hostinger VPS adım adım kurulum ve güncelleme rehberi.
- [DEPLOY-VPS-MCP.md](./DEPLOY-VPS-MCP.md) — MCP tabanlı VPS deploy yaklaşımı.
- [DEPLOY-HOSTINGER-TR.md](./DEPLOY-HOSTINGER-TR.md) — Hostinger deploy Türkçe kısa rehber.
- [HOSTINGER-SUNUCU-DEPLOY.md](./HOSTINGER-SUNUCU-DEPLOY.md) — Hostinger sunucu deploy notları.
- [DEPLOY-VPS-ADIMLAR.md](./DEPLOY-VPS-ADIMLAR.md) — VPS deploy adımları (özet).
- [VPS-DEPLOY-KOMUTLARI.md](./VPS-DEPLOY-KOMUTLARI.md) — Pratik deploy komut listesi.

## Primary Scripts

- [setup-vps.sh](./setup-vps.sh) — VPS ilk kurulum (git tabanlı).
- [update-vps.sh](./update-vps.sh) — VPS hızlı güncelleme.
- [setup-vps-no-git.sh](./setup-vps-no-git.sh) — Git olmadan kurulum alternatifi.
- [update-vps-no-git.sh](./update-vps-no-git.sh) — Git olmadan güncelleme alternatifi.
- [vps-deploy.sh](./vps-deploy.sh) — VPS deploy otomasyon scripti.
- [vps-deploy-mcp.cjs](./vps-deploy-mcp.cjs) — MCP destekli deploy scripti.
- [simple-deploy.cjs](./simple-deploy.cjs) — Basit deploy akışı.

## Packaging Utilities

- [create-deploy-zip.sh](./create-deploy-zip.sh) — Unix deploy paketi oluşturma.
- [create-deploy-zip.ps1](./create-deploy-zip.ps1) — Windows deploy paketi oluşturma.
- [vps-deploy-apply.ps1](./vps-deploy-apply.ps1) — Windows PowerShell ile deploy uygulama.

---

## Recommended Reading Order

1. [OPS-RUNBOOK.md](./OPS-RUNBOOK.md)
2. [HOSTINGER.md](./HOSTINGER.md)
3. İhtiyaca göre script dosyaları

## Notes

- `._*` ile başlayan dosyalar macOS metadata dosyalarıdır, deploy akışında kullanılmaz.
- Ana referans doküman her zaman **OPS-RUNBOOK.md** olmalıdır.
